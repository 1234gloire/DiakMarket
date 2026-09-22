import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';
import { createAuthedUser, createPublishedProduct, getSenegalCountryId, setUserCountry } from './utils/fixtures.js';
import { promoteToAdmin, testPrisma } from './utils/db.js';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let countryId: string;

  beforeAll(async () => {
    app = await createTestApp();
    countryId = await getSenegalCountryId(app);
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
    await app.close();
  });

  it('blocks a seller from adding their own product to their cart', async () => {
    const seller = await createAuthedUser(app);
    const productId = await createPublishedProduct(app, seller.token, { countryId });

    await request(app.getHttpServer())
      .post('/api/v1/carts/me/items')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ productId, quantity: 1 })
      .expect(400);
  });

  it('checkout computes the total server-side, decrements stock, and returns a non-empty status history', async () => {
    const seller = await createAuthedUser(app);
    const buyer = await createAuthedUser(app);
    const productId = await createPublishedProduct(app, seller.token, { countryId, price: 25000 });

    await request(app.getHttpServer())
      .post('/api/v1/carts/me/items')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ productId, quantity: 1 })
      .expect(201);

    const orderRes = await request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ deliveryMode: 'HAND_TO_HAND' })
      .expect(201);

    expect(orderRes.body.status).toBe('PENDING_PAYMENT');
    expect(orderRes.body.currencyCode).toBe('XOF');
    expect(orderRes.body.grandTotal).toBe(25000);
    // Regression: the initial history row used to be missing from this response even though it
    // was persisted — see OrdersService.checkout().
    expect(orderRes.body.statusHistory).toHaveLength(1);
    expect(orderRes.body.statusHistory[0].toStatus).toBe('PENDING_PAYMENT');

    const product = await testPrisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.quantity).toBe(0);
  });

  it('rejects checkout when stock is insufficient', async () => {
    const seller = await createAuthedUser(app);
    const buyerA = await createAuthedUser(app);
    const buyerB = await createAuthedUser(app);
    const productId = await createPublishedProduct(app, seller.token, { countryId });

    await request(app.getHttpServer())
      .post('/api/v1/carts/me/items')
      .set('Authorization', `Bearer ${buyerA.token}`)
      .send({ productId, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/carts/me/items')
      .set('Authorization', `Bearer ${buyerB.token}`)
      .send({ productId, quantity: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${buyerA.token}`)
      .send({ deliveryMode: 'HAND_TO_HAND' })
      .expect(201);

    // The product's only unit is now sold — buyer B's checkout must fail, not oversell.
    await request(app.getHttpServer())
      .post('/api/v1/orders/checkout')
      .set('Authorization', `Bearer ${buyerB.token}`)
      .send({ deliveryMode: 'HAND_TO_HAND' })
      .expect(400);
  });

  describe('full state machine lifecycle', () => {
    let buyer: { token: string; userId: string };
    let seller: { token: string; userId: string };
    let admin: { token: string; userId: string };
    let orderId: string;

    beforeAll(async () => {
      seller = await createAuthedUser(app);
      buyer = await createAuthedUser(app);
      admin = await createAuthedUser(app);
      await promoteToAdmin(admin.userId);

      const productId = await createPublishedProduct(app, seller.token, { countryId });
      await request(app.getHttpServer())
        .post('/api/v1/carts/me/items')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ productId, quantity: 1 })
        .expect(201);
      const orderRes = await request(app.getHttpServer())
        .post('/api/v1/orders/checkout')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ deliveryMode: 'HAND_TO_HAND' })
        .expect(201);
      orderId = orderRes.body.id;
    });

    it('cannot be pushed to PAID directly through the generic status endpoint', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ toStatus: 'PAID' })
        .expect(403);
      expect(res.body.message.message).toMatch(/payment provider webhook/i);
    });

    it('reaches PAID only via the payment webhook', async () => {
      const initRes = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ orderId, payerPhone: '+221771234567' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/payments/dev/simulate')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ transactionId: initRes.body.id, outcome: 'SUCCEEDED' })
        .expect(201);

      const orderRes = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .expect(200);
      expect(orderRes.body.status).toBe('PAID');
    });

    it('rejects an illegal jump and a wrong-role transition', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ toStatus: 'DELIVERED' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ toStatus: 'SELLER_CONFIRMED' })
        .expect(403);
    });

    it('walks seller -> courier(admin) -> buyer transitions to COMPLETED', async () => {
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

      for (const toStatus of ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED']) {
        await request(app.getHttpServer())
          .patch(`/api/v1/orders/${orderId}/status`)
          .set('Authorization', `Bearer ${admin.token}`)
          .send({ toStatus })
          .expect(200);
      }

      const confirmRes = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ toStatus: 'BUYER_CONFIRMED' })
        .expect(200);

      // BUYER_CONFIRMED auto-cascades to COMPLETED in the same request.
      expect(confirmRes.body.status).toBe('COMPLETED');

      const historyRes = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .expect(200);
      const transitions = historyRes.body.statusHistory.map((h: { toStatus: string }) => h.toStatus);
      expect(transitions).toEqual([
        'PENDING_PAYMENT',
        'PAID',
        'SELLER_CONFIRMED',
        'READY_FOR_PICKUP',
        'PICKED_UP',
        'IN_TRANSIT',
        'DELIVERED',
        'BUYER_CONFIRMED',
        'COMPLETED',
      ]);
    });
  });
});
