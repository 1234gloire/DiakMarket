import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';
import { createAuthedUser, getFirstCategoryId, getSenegalCountryId, setUserCountry } from './utils/fixtures.js';
import { promoteToAdmin, testPrisma } from './utils/db.js';

// Dakar-ish coordinates — close enough to each other to fall within the default 15km dispatch
// search radius, far enough apart to prove distance math isn't just returning zero.
const PICKUP = { latitude: 14.6928, longitude: -17.4467 };
const DROPOFF = { latitude: 14.7167, longitude: -17.4677 };

describe('Deliveries — dispatch, QR pickup, OTP confirmation (e2e)', () => {
  let app: INestApplication;
  let countryId: string;
  let categoryId: string;

  async function createOrderReadyForPickup() {
    const seller = await createAuthedUser(app);
    const buyer = await createAuthedUser(app);
    await setUserCountry(app, buyer.token, countryId);

    const productRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({
        categoryId,
        countryId,
        title: 'Produit géolocalisé',
        description: 'Pour tester le dispatch',
        price: 20000,
        condition: 'GOOD',
        quantity: 1,
        latitude: PICKUP.latitude,
        longitude: PICKUP.longitude,
      })
      .expect(201);
    const productId = productRes.body.id;
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ url: 'https://res.cloudinary.com/demo/image/upload/test.jpg', publicId: 'test/x' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/publish`)
      .set('Authorization', `Bearer ${seller.token}`)
      .expect(201);

    const addressRes = await request(app.getHttpServer())
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ countryId, line1: 'Rue du test', latitude: DROPOFF.latitude, longitude: DROPOFF.longitude })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/carts/me/items')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId, quantity: 1 })
      .expect(201);
    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ deliveryMode: 'HOME_DELIVERY', shippingAddressId: addressRes.body.id })
      .expect(201);
    const orderId = orderRes.body.id;

    // Estimated delivery fee at checkout should now be > 0 (SN pricing rule seeded).
    expect(orderRes.body.deliveryFee).toBeGreaterThan(0);

    // Drive to PAID via the real mock webhook path (matches how payments.e2e-spec.ts does it),
    // then seller confirms and marks ready for pickup — which must auto-create the Delivery.
    const txRes = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ orderId, payerPhone: '+221771234567' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/payments/dev/simulate')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ transactionId: txRes.body.id, outcome: 'SUCCEEDED' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ toStatus: 'SELLER_CONFIRMED' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ toStatus: 'READY_FOR_PICKUP' })
      .expect(200);

    return { orderId, buyer, seller };
  }

  async function createAvailableCourierNear(point: { latitude: number; longitude: number }) {
    const courier = await createAuthedUser(app);
    const admin = await createAuthedUser(app);
    await promoteToAdmin(admin.userId);

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/couriers/me')
      .set('Authorization', `Bearer ${courier.token}`)
      .send({ vehicleType: 'MOTO' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/couriers/${registerRes.body.id}/verify`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/v1/couriers/me/location')
      .set('Authorization', `Bearer ${courier.token}`)
      .send(point)
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/v1/couriers/me/availability')
      .set('Authorization', `Bearer ${courier.token}`)
      .send({ isAvailable: true })
      .expect(200);

    return courier;
  }

  beforeAll(async () => {
    app = await createTestApp();
    countryId = await getSenegalCountryId(app);
    categoryId = await getFirstCategoryId(app);
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
    await app.close();
  });

  it('auto-creates a Delivery with a positive courier fee when the order reaches READY_FOR_PICKUP', async () => {
    const { orderId, buyer } = await createOrderReadyForPickup();

    const res = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/by-order/${orderId}`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);

    expect(res.body.status).toBe('SEARCHING_COURIER');
    expect(res.body.courierFee).toBeGreaterThan(0);
    expect(res.body.qrCode).toBeTruthy();
  });

  it('a courier without a shared location cannot browse open deliveries', async () => {
    const courier = await createAuthedUser(app);
    await request(app.getHttpServer()).post('/api/v1/couriers/me').set('Authorization', `Bearer ${courier.token}`).send({}).expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/deliveries/open/nearby')
      .set('Authorization', `Bearer ${courier.token}`)
      .expect(400);
  });

  it('a nearby available courier sees the delivery on the job board and can claim it — first claim wins', async () => {
    const { orderId } = await createOrderReadyForPickup();
    const courierA = await createAvailableCourierNear(PICKUP);
    const courierB = await createAvailableCourierNear(PICKUP);

    const boardRes = await request(app.getHttpServer())
      .get('/api/v1/deliveries/open/nearby')
      .set('Authorization', `Bearer ${courierA.token}`)
      .expect(200);
    const delivery = boardRes.body.find((d: { order: { id: string } }) => d.order.id === orderId);
    expect(delivery).toBeTruthy();
    expect(delivery.distanceMeters).toBeLessThan(1000); // courier is at the exact pickup point

    await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${delivery.id}/claim`)
      .set('Authorization', `Bearer ${courierA.token}`)
      .expect(201);

    // Second courier is too late — the delivery is no longer SEARCHING_COURIER.
    await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${delivery.id}/claim`)
      .set('Authorization', `Bearer ${courierB.token}`)
      .expect(400);
  });

  it('walks a full dispatch → QR pickup → OTP confirmation cycle', async () => {
    const { orderId, buyer } = await createOrderReadyForPickup();
    const courier = await createAvailableCourierNear(PICKUP);

    const boardRes = await request(app.getHttpServer())
      .get('/api/v1/deliveries/open/nearby')
      .set('Authorization', `Bearer ${courier.token}`)
      .expect(200);
    const deliveryId = boardRes.body.find((d: { order: { id: string } }) => d.order.id === orderId).id;

    await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${deliveryId}/claim`)
      .set('Authorization', `Bearer ${courier.token}`)
      .expect(201);

    const deliveryRes = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/by-order/${orderId}`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);
    const qrCode = deliveryRes.body.qrCode;

    // Wrong QR code is rejected.
    await request(app.getHttpServer())
      .patch(`/api/v1/deliveries/${deliveryId}/picked-up`)
      .set('Authorization', `Bearer ${courier.token}`)
      .send({ qrCode: 'not-the-real-code' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/deliveries/${deliveryId}/picked-up`)
      .set('Authorization', `Bearer ${courier.token}`)
      .send({ qrCode })
      .expect(200);

    let orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);
    expect(orderRes.body.status).toBe('PICKED_UP');

    await request(app.getHttpServer())
      .patch(`/api/v1/deliveries/${deliveryId}/start-transit`)
      .set('Authorization', `Bearer ${courier.token}`)
      .expect(200);

    orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);
    expect(orderRes.body.status).toBe('IN_TRANSIT');

    // The OTP was never returned to the courier — the buyer reads it from their own notification.
    const notifications = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);
    const otpNotification = notifications.body.find((n: { type: string }) => n.type === 'DELIVERY_IN_PROGRESS');
    expect(otpNotification).toBeTruthy();
    const otp = otpNotification.data.otp as string;
    expect(otp).toMatch(/^\d{6}$/);

    // Wrong OTP is rejected and counts as an attempt.
    await request(app.getHttpServer())
      .patch(`/api/v1/deliveries/${deliveryId}/confirm`)
      .set('Authorization', `Bearer ${courier.token}`)
      .send({ otpCode: '000000' })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/deliveries/${deliveryId}/confirm`)
      .set('Authorization', `Bearer ${courier.token}`)
      .send({ otpCode: otp })
      .expect(200);

    orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);
    expect(orderRes.body.status).toBe('DELIVERED');

    // The buyer can now confirm receipt through the existing flow, completing the order.
    const confirmRes = await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ toStatus: 'BUYER_CONFIRMED' })
      .expect(200);
    expect(confirmRes.body.status).toBe('COMPLETED');
  });

  it('a courier can no longer use the generic order-status endpoint for pickup/transit/delivered', async () => {
    const { orderId } = await createOrderReadyForPickup();
    const courier = await createAvailableCourierNear(PICKUP);

    await request(app.getHttpServer())
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${courier.token}`)
      .send({ toStatus: 'PICKED_UP' })
      .expect(403);
  });
});
