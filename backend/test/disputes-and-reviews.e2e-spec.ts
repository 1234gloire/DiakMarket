import { createHmac, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';
import { createAuthedUser, createPublishedProduct, getSenegalCountryId } from './utils/fixtures.js';
import { promoteToAdmin } from './utils/db.js';

const MOCK_SECRET = 'diakmarket-mock-provider-secret';

describe('Disputes and reviews (e2e)', () => {
  let app: INestApplication;
  let countryId: string;

  /** Drives an order all the way to COMPLETED so disputes/reviews can be opened on it. */
  async function createCompletedOrder() {
    const seller = await createAuthedUser(app);
    const buyer = await createAuthedUser(app);
    const admin = await createAuthedUser(app);
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
    const orderId = orderRes.body.id;

    const txRes = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ orderId, payerPhone: '+221771234567' })
      .expect(201);
    const payload = { externalEventId: randomUUID(), providerReference: txRes.body.providerReference, status: 'SUCCEEDED' };
    const rawBody = JSON.stringify(payload);
    const signature = createHmac('sha256', MOCK_SECRET).update(rawBody).digest('hex');
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/MOCK')
      .set('Content-Type', 'application/json')
      .set('x-mock-signature', signature)
      .send(rawBody)
      .expect(201);

    for (const [token, toStatus] of [
      [seller.token, 'SELLER_CONFIRMED'],
      [seller.token, 'READY_FOR_PICKUP'],
      [admin.token, 'PICKED_UP'],
      [admin.token, 'IN_TRANSIT'],
      [admin.token, 'DELIVERED'],
      [buyer.token, 'BUYER_CONFIRMED'],
    ] as const) {
      await request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ toStatus })
        .expect(200);
    }

    return { orderId, seller, buyer, admin };
  }

  beforeAll(async () => {
    app = await createTestApp();
    countryId = await getSenegalCountryId(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('reviews', () => {
    it('lets the buyer rate the seller once, recomputes the average, and blocks a duplicate', async () => {
      const { orderId, buyer, seller } = await createCompletedOrder();

      const reviewRes = await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ orderId, type: 'BUYER_TO_SELLER', targetId: seller.userId, rating: 5, comment: 'Great!' })
        .expect(201);
      expect(reviewRes.body.rating).toBe(5);

      await request(app.getHttpServer())
        .post('/api/v1/reviews')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ orderId, type: 'BUYER_TO_SELLER', targetId: seller.userId, rating: 1 })
        .expect(409);

      const sellerRes = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${seller.token}`)
        .expect(200);
      expect(sellerRes.body.profile.ratingAvg).toBe(5);
      expect(sellerRes.body.profile.ratingCount).toBe(1);
    });
  });

  describe('disputes', () => {
    it('opens a dispute, isolates access to parties/admin, and resolves to REFUNDED', async () => {
      const { orderId, buyer, seller, admin } = await createCompletedOrder();
      const stranger = await createAuthedUser(app);

      const disputeRes = await request(app.getHttpServer())
        .post('/api/v1/disputes')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ orderId, reason: 'ITEM_NOT_AS_DESCRIBED', description: 'Wrong color' })
        .expect(201);
      const disputeId = disputeRes.body.id;

      const orderAfterOpen = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .expect(200);
      expect(orderAfterOpen.body.status).toBe('DISPUTED');

      await request(app.getHttpServer())
        .get(`/api/v1/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${stranger.token}`)
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({ status: 'REFUNDED', refundAmount: 10000 })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/v1/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ status: 'REFUNDED', refundAmount: 10000, resolutionNote: 'Valid claim' })
        .expect(200);

      const orderAfterResolve = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .expect(200);
      expect(orderAfterResolve.body.status).toBe('REFUNDED');
    });
  });
});
