import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../models/user.entity';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { Redis } from 'ioredis';
import { hashOtp } from '../utils/otp.util';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Repository<User>;
  let jwtService: JwtService;
  let redisClient: Redis;
  const mockUser = { id: 'uuid', name: 'Test', email: 'test@example.com', phone: '+123', password: 'hashed' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), findOneBy: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token') } },
        { provide: 'REDIS_CLIENT', useValue: { set: jest.fn(), get: jest.fn(), del: jest.fn() } },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
    redisClient = module.get('REDIS_CLIENT');
  });

  it('should register a user', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    jest.spyOn(userRepo, 'create').mockReturnValue(mockUser);
    jest.spyOn(userRepo, 'save').mockResolvedValue(mockUser);
    const result = await service.register({ name: 'Test', email: 'test@example.com', phone: '+123', password: 'pass' });
    expect(result).toEqual({ token: 'token' });
    expect(jwtService.sign).toHaveBeenCalled();
  });

  it('should login with password', async () => {
    jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const result = await service.login({ identifier: 'test@example.com', password: 'pass' });
    expect(result).toEqual({ token: 'token' });
  });

  it('should throw on invalid login', async () => {
    jest.spyOn(userRepo, 'findOne').mockResolvedValue(null);
    await expect(service.login({ identifier: 'wrong', password: 'pass' })).rejects.toThrow(UnauthorizedException);
  });

  it('should send OTP', async () => {
    jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
    jest.spyOn(redisClient, 'set').mockResolvedValue('OK');
    const result = await service.sendOtp({ identifier: 'test@example.com' });
    expect(result).toEqual({ message: 'OTP sent' });
    expect(redisClient.set).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'EX', 300);
  });

  it('should verify OTP and return token', async () => {
    jest.spyOn(redisClient, 'get').mockResolvedValue(hashOtp('123456'));
    jest.spyOn(userRepo, 'findOne').mockResolvedValue(mockUser);
    jest.spyOn(redisClient, 'del').mockResolvedValue(1);
    const result = await service.verifyOtp({ identifier: 'test@example.com', otp: '123456' });
    expect(result).toEqual({ token: 'token' });
  });

  it('should throw on invalid OTP', async () => {
    jest.spyOn(redisClient, 'get').mockResolvedValue(null);
    await expect(service.verifyOtp({ identifier: 'test', otp: 'wrong' })).rejects.toThrow(UnauthorizedException);
  });
});