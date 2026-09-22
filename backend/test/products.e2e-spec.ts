import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';
import { createAuthedUser, getFirstCategoryId, getSenegalCountryId } from './utils/fixtures.js';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let categoryId: string;
  let countryId: string;

  beforeAll(async () => {
    app = await createTestApp();
    categoryId = await getFirstCategoryId(app);
    countryId = await getSenegalCountryId(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('derives currencyCode from the country server-side, ignoring anything the client sends', async () => {
    const seller = await createAuthedUser(app);

    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({
        categoryId,
        countryId,
        title: 'Robe wax',
        description: 'Belle robe',
        price: 25000,
        condition: 'LIKE_NEW',
        quantity: 1,
        // Deliberately not sending a currency at all — DTO doesn't even accept one.
      })
      .expect(201);

    expect(res.body.currencyCode).toBe('XOF');
    expect(res.body.status).toBe('DRAFT');
  });

  it('refuses to publish a product with no image, then succeeds once one is registered', async () => {
    const seller = await createAuthedUser(app);
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ categoryId, countryId, title: 'Sac', description: 'desc', price: 5000, condition: 'GOOD', quantity: 1 })
      .expect(201);
    const productId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/publish`)
      .set('Authorization', `Bearer ${seller.token}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/images`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ url: 'https://res.cloudinary.com/demo/image/upload/sac.jpg', publicId: 'test/sac', isPrimary: true })
      .expect(201);

    const publishRes = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/publish`)
      .set('Authorization', `Bearer ${seller.token}`)
      .expect(201);
    expect(publishRes.body.status).toBe('ACTIVE');
  });

  it('prevents a user from editing a product they do not own', async () => {
    const seller = await createAuthedUser(app);
    const stranger = await createAuthedUser(app);
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ categoryId, countryId, title: 'Not yours', description: 'desc', price: 1000, condition: 'GOOD', quantity: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${createRes.body.id}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ title: 'Hijacked' })
      .expect(403);
  });

  it('published products are publicly searchable without auth', async () => {
    const seller = await createAuthedUser(app);
    const uniqueTitle = `Findable Product ${Date.now()}`;
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ categoryId, countryId, title: uniqueTitle, description: 'desc', price: 1000, condition: 'GOOD', quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/products/${createRes.body.id}/images`)
      .set('Authorization', `Bearer ${seller.token}`)
      .send({ url: 'https://res.cloudinary.com/demo/image/upload/x.jpg', publicId: 'test/x' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/products/${createRes.body.id}/publish`)
      .set('Authorization', `Bearer ${seller.token}`)
      .expect(201);

    const searchRes = await request(app.getHttpServer())
      .get('/api/v1/products')
      .query({ search: uniqueTitle })
      .expect(200);
    expect(searchRes.body.data.some((p: { id: string }) => p.id === createRes.body.id)).toBe(true);
  });
});
