import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  it('GET /api/v1/countries is public and returns a list', () => {
    return request(app.getHttpServer())
      .get('/api/v1/countries')
      .expect(200)
      .expect((res) => {
        if (!Array.isArray(res.body)) throw new Error('Expected an array response');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
