import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';
import { mintTestJwt } from './utils/test-jwt.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a request with no token', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });

  it('rejects a request with a garbage token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer not.a.real.jwt')
      .expect(401);
  });

  it('accepts a validly-signed token and JIT-provisions the user', async () => {
    const email = `jit-provision-${crypto.randomUUID()}@test.diakmarket`;
    const { token, sub } = mintTestJwt({ email });

    const res = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.id).toBe(sub);
    expect(res.body.email).toBe(email);
    expect(res.body.roles).toEqual(['USER']);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.profile).toBeTruthy();
  });

  it('rejects a token signed with the wrong secret', async () => {
    // Same shape, different signature — must not verify.
    const { token } = mintTestJwt({ email: 'forged@test.diakmarket' });
    const forged = token.slice(0, -4) + 'AAAA';

    await request(app.getHttpServer()).get('/api/v1/users/me').set('Authorization', `Bearer ${forged}`).expect(401);
  });

  it('regression: two different users with no phone number (Supabase sends "") both JIT-provision', async () => {
    // Supabase's JWT carries an unset phone as "" rather than omitting the claim. Since
    // users.phone is @unique, writing "" verbatim let only the FIRST such user succeed —
    // see UsersService.syncFromSupabase's blankToNull normalization.
    const first = mintTestJwt({ email: `phoneless-one-${crypto.randomUUID()}@test.diakmarket`, phone: '' });
    const second = mintTestJwt({ email: `phoneless-two-${crypto.randomUUID()}@test.diakmarket`, phone: '' });

    const resA = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${first.token}`)
      .expect(200);
    const resB = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${second.token}`)
      .expect(200);

    expect(resA.body.phone).toBeNull();
    expect(resB.body.phone).toBeNull();
  });
});
