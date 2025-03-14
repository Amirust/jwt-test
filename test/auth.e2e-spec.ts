import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ethers } from 'ethers';
import * as process from 'node:process';
import { randomBytes } from 'node:crypto';
import fastifyCookie from '@fastify/cookie';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';

describe('AuthController (e2e)', () => {
  let app: NestFastifyApplication;
  const wallet = ethers.Wallet.createRandom();

  beforeAll(async () => {
    process.env.JWT_EXPIRES_IN = '14d';
    process.env.JWT_SECRET = randomBytes(32).toString('hex');
    process.env.APP_PORT = '3000';
    process.env.COOKIE_SECRET = randomBytes(32).toString('hex');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ AppModule ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

    await app.init();

    await app.register(fastifyCookie, {
      secret: process.env.COOKIE_SECRET,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.getHttpAdapter().getInstance().ready();
  });

  it('/auth/payload (GET)', () => {
    return request(app.getHttpServer())
      .get('/auth/payload')
      .expect(200)
      .expect((res) => {
        expect(res.body.result).toHaveProperty('bytes');
        expect(res.body.result).toHaveProperty('timestamp');
      });
  });

  it('/auth/verify (POST)', async () => {
    const payloadResponse = await request(app.getHttpServer())
      .get('/auth/payload')
      .expect(200);

    const notSignedData = payloadResponse.body.result;
    const signedData = await wallet.signMessage(ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(notSignedData))));
    const publicKey = wallet.publicKey;

    return request(app.getHttpServer())
      .post('/auth/verify')
      .send({ notSignedData, signedData, publicKey })
      .expect((res) => {
        expect(res.headers['set-cookie']).toBeDefined();
      })
  });

  it('/auth/verify (POST) - should throw BadRequestException if publicKey is invalid', async () => {
    const payloadResponse = await request(app.getHttpServer())
      .get('/auth/payload')
      .expect(200);

    const notSignedData = payloadResponse.body.result;
    const signedData = await wallet.signMessage(ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(notSignedData))));
    const publicKey = '0x03';

    return request(app.getHttpServer())
      .post('/auth/verify')
      .send({ notSignedData, signedData, publicKey })
      .expect(400)
  });

  it('/auth/refresh (POST)', async () => {
    const payloadResponse = await request(app.getHttpServer())
      .get('/auth/payload')
      .expect(200);

    const notSignedData = payloadResponse.body.result;
    const signedData = await wallet.signMessage(ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(notSignedData))));
    const publicKey = wallet.publicKey;

    const verifyResponse = await request(app.getHttpServer())
      .post('/auth/verify')
      .send({ notSignedData, signedData, publicKey })
      .expect(200);

    const cookie = verifyResponse.headers['set-cookie'];

    return request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookie)
      .expect(200)
      .expect((res) => {
        expect(res.headers['set-cookie']).toBeDefined();
      });
  });

  it('/auth/refresh (POST) - should throw BadRequestException if token is not provided', () => {
    return request(app.getHttpServer())
      .post('/auth/refresh')
      .expect(400)
  });
});