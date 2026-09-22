import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/test-app.js';
import { createAuthedUser } from './utils/fixtures.js';
import { promoteToAdmin, testPrisma } from './utils/db.js';

describe('RBAC (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
    await app.close();
  });

  it('blocks a plain USER from an ADMIN-only route', async () => {
    const user = await createAuthedUser(app);
    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(403);
  });

  it('lets a plain ADMIN through the class-level @Roles guard', async () => {
    const admin = await createAuthedUser(app);
    await testPrisma.user.update({ where: { id: admin.userId }, data: { roles: ['ADMIN'] } });

    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);
  });

  it('blocks a plain ADMIN (no SUPER_ADMIN) from a method-level SUPER_ADMIN override', async () => {
    const admin = await createAuthedUser(app);
    await testPrisma.user.update({ where: { id: admin.userId }, data: { roles: ['ADMIN'] } });
    const target = await createAuthedUser(app);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${target.userId}/roles`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ roles: ['USER', 'ADMIN'] })
      .expect(403);
  });

  it('lets SUPER_ADMIN through the method-level override', async () => {
    const superAdmin = await createAuthedUser(app);
    await promoteToAdmin(superAdmin.userId);
    const target = await createAuthedUser(app);

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${target.userId}/roles`)
      .set('Authorization', `Bearer ${superAdmin.token}`)
      .send({ roles: ['USER', 'ADMIN'] })
      .expect(200);
    expect(res.body.roles).toEqual(['USER', 'ADMIN']);
  });
});
