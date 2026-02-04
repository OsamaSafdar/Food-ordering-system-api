import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('AuthController', () => {
  let app: INestApplication;
  let authService = { register: jest.fn(), login: jest.fn(), sendOtp: jest.fn(), verifyOtp: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('/auth/register (POST)', async () => {
    authService.register.mockResolvedValue({ token: 'token' });
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Test', email: 'test@example.com', phone: '+123', password: 'pass' })
      .expect(201)
      .expect({ token: 'token' });
  });

  it('/auth/login (POST)', async () => {
    authService.login.mockResolvedValue({ token: 'token' });
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'test@example.com', password: 'pass' })
      .expect(200)
      .expect({ token: 'token' });
  });

  it('/auth/otp/send (POST)', async () => {
    authService.sendOtp.mockResolvedValue({ message: 'OTP sent' });
    return request(app.getHttpServer())
      .post('/auth/otp/send')
      .send({ identifier: 'test@example.com' })
      .expect(200)
      .expect({ message: 'OTP sent' });
  });

  it('/auth/otp/verify (POST)', async () => {
    authService.verifyOtp.mockResolvedValue({ token: 'token' });
    return request(app.getHttpServer())
      .post('/auth/otp/verify')
      .send({ identifier: 'test@example.com', otp: '123456' })
      .expect(200)
      .expect({ token: 'token' });
  });

  afterAll(async () => {
    await app.close();
  });
});