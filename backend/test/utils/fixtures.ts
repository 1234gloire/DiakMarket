import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { mintTestJwt } from './test-jwt.js';

export async function createAuthedUser(app: INestApplication, options: { email?: string } = {}) {
  const { token, sub } = mintTestJwt({ email: options.email ?? `${crypto.randomUUID()}@test.diakmarket` });
  // First authenticated call JIT-provisions the user row.
  await request(app.getHttpServer()).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`).expect(200);
  return { token, userId: sub };
}

export async function getSenegalCountryId(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer()).get('/api/v1/countries').expect(200);
  const senegal = res.body.find((c: { code: string }) => c.code === 'SN');
  if (!senegal) throw new Error('Senegal not found — did the test DB seed run?');
  return senegal.id;
}

export async function getFirstCategoryId(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer()).get('/api/v1/categories').expect(200);
  if (res.body.length === 0) throw new Error('No categories found — did the test DB seed run?');
  return res.body[0].id;
}

export async function setUserCountry(app: INestApplication, token: string, countryId: string) {
  await request(app.getHttpServer())
    .patch('/api/v1/users/me/country')
    .set('Authorization', `Bearer ${token}`)
    .send({ countryId })
    .expect(200);
}

/** Creates, images, and publishes a product owned by `sellerToken`. Returns the product id. */
export async function createPublishedProduct(
  app: INestApplication,
  sellerToken: string,
  overrides: Partial<{ categoryId: string; countryId: string; price: number; title: string }> = {},
) {
  const categoryId = overrides.categoryId ?? (await getFirstCategoryId(app));
  const countryId = overrides.countryId ?? (await getSenegalCountryId(app));

  const createRes = await request(app.getHttpServer())
    .post('/api/v1/products')
    .set('Authorization', `Bearer ${sellerToken}`)
    .send({
      categoryId,
      countryId,
      title: overrides.title ?? 'Test product',
      description: 'A product created by a test fixture',
      price: overrides.price ?? 10000,
      condition: 'NEW',
      quantity: 1,
    })
    .expect(201);
  const productId = createRes.body.id;

  await request(app.getHttpServer())
    .post(`/api/v1/products/${productId}/images`)
    .set('Authorization', `Bearer ${sellerToken}`)
    .send({ url: 'https://res.cloudinary.com/demo/image/upload/test.jpg', publicId: 'test/fixture', isPrimary: true })
    .expect(201);

  await request(app.getHttpServer())
    .post(`/api/v1/products/${productId}/publish`)
    .set('Authorization', `Bearer ${sellerToken}`)
    .expect(201);

  return productId as string;
}
