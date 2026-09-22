import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';

describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/countries is public and returns the seeded countries', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/countries').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((c: { code: string }) => c.code === 'SN')).toBe(true);
  });
});
