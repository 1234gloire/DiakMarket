import { createHmac, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';
import { createAuthedUser, createPublishedProduct, getSenegalCountryId } from './utils/fixtures.js';

// Mirrors MockPaymentProvider's hardcoded dev/test secret (mock-payment.provider.ts) — webhooks
// are only ever signed with this outside production, so the test can build its own valid payload.
const MOCK_SECRET = 'diakmarket-mock-provider-secret';

function signWebhook(providerReference: string, status: 'SUCCEEDED' | 'FAILED', externalEventId = randomUUID()) {
  const payload = { externalEventId, providerReference, status };
  const rawBody = JSON.stringify(payload);
  const signature = createHmac('sha256', MOCK_SECRET).update(rawBody).digest('hex');
  return { rawBody, signature };
}

describe('Payments webhook (e2e)', () => {
  let app: INestApplication;
  let countryId: string;

  async function createPendingOrder() {
    const seller = await createAuthedUser(app);
    const buyer = await createAuthedUser(app);
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
    const txRes = await request(app.getHttpServer())
      .post('/api/v1/payments/initiate')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ orderId: orderRes.body.id, payerPhone: '+221771234567' })
      .expect(201);
    return { orderId: orderRes.body.id as string, transactionId: txRes.body.id as string, providerReference: txRes.body.providerReference as string, buyerToken: buyer.token };
  }

  beforeAll(async () => {
    app = await createTestApp();
    countryId = await getSenegalCountryId(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a webhook with an invalid signature', async () => {
    const { providerReference } = await createPendingOrder();
    const { rawBody } = signWebhook(providerReference, 'SUCCEEDED');

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/MOCK')
      .set('Content-Type', 'application/json')
      .set('x-mock-signature', 'deadbeef-not-a-real-signature')
      .send(rawBody)
      .expect(403);
  });

  it('accepts a validly-signed webhook and moves the order to PAID', async () => {
    const { orderId, providerReference, buyerToken } = await createPendingOrder();
    const { rawBody, signature } = signWebhook(providerReference, 'SUCCEEDED');

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/MOCK')
      .set('Content-Type', 'application/json')
      .set('x-mock-signature', signature)
      .send(rawBody)
      .expect(201);

    const orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(orderRes.body.status).toBe('PAID');
  });

  it('is idempotent: replaying the exact same webhook event does not re-process or error', async () => {
    const { providerReference } = await createPendingOrder();
    const eventId = randomUUID();
    const { rawBody, signature } = signWebhook(providerReference, 'SUCCEEDED', eventId);

    const first = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/MOCK')
      .set('Content-Type', 'application/json')
      .set('x-mock-signature', signature)
      .send(rawBody)
      .expect(201);
    expect(first.body.alreadyProcessed).toBe(false);

    const second = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/MOCK')
      .set('Content-Type', 'application/json')
      .set('x-mock-signature', signature)
      .send(rawBody)
      .expect(201);
    expect(second.body.alreadyProcessed).toBe(true);
  });

  it('moves the order to PAYMENT_FAILED on a FAILED webhook', async () => {
    const { orderId, providerReference, buyerToken } = await createPendingOrder();
    const { rawBody, signature } = signWebhook(providerReference, 'FAILED');

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/MOCK')
      .set('Content-Type', 'application/json')
      .set('x-mock-signature', signature)
      .send(rawBody)
      .expect(201);

    const orderRes = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(orderRes.body.status).toBe('PAYMENT_FAILED');
  });

  it('the dev/simulate endpoint is unavailable in production', async () => {
    // Create the order/transaction in test mode first — resolveProvider() itself refuses to
    // fall back to MOCK in production, which would fail this setup step for an unrelated reason.
    const { transactionId, buyerToken } = await createPendingOrder();

    process.env.NODE_ENV = 'production';
    try {
      await request(app.getHttpServer())
        .post('/api/v1/payments/dev/simulate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ transactionId, outcome: 'SUCCEEDED' })
        .expect(403);
    } finally {
      process.env.NODE_ENV = 'test';
    }
  });
});
