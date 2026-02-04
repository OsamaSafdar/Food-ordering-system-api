import { Inject, Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../models/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { generateOtp, hashOtp } from '../utils/otp.util';
import { Redis } from 'ioredis';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    @Inject('REDIS_CLIENT') private redisClient: Redis,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ token: string }> {
    const { name, email, phone, password } = registerDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({ name, email, phone, password: hashedPassword });
    await this.usersRepository.save(user);
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    await this.saveToken(user, token);
    return { token };
  }

  async login(loginDto: LoginDto): Promise<{ token: string }> {
    const { identifier, password } = loginDto;
    const user = await this.findUserByIdentifier(identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    await this.saveToken(user, token);
    return { token };
  }

  async sendOtp(sendOtpDto: SendOtpDto): Promise<{ message: string }> {
    const { identifier } = sendOtpDto;
    const user = await this.findUserByIdentifier(identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);
    await this.redisClient.set(`otp:${identifier}`, hashedOtp, 'EX', 300); // 5 min TTL
    // simulating here ,In prod we send via email/SMS; here, log for testing
    console.log(`OTP for ${identifier}: ${otp}`);
    return { message: 'OTP sent' };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ token: string }> {
    const { identifier, otp } = verifyOtpDto;
    const storedHashedOtp = await this.redisClient.get(`otp:${identifier}`);
    if (!storedHashedOtp || hashOtp(otp) !== storedHashedOtp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.redisClient.del(`otp:${identifier}`);
    const user = await this.findUserByIdentifier(identifier);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    await this.saveToken(user, token);
    return { token };
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async findUserByIdentifier(identifier: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: [{ email: identifier }, { phone: identifier }],
    });
  }

  private async saveToken(user: User, token: string) {
    if (!user.tokens) {
      user.tokens = [];
    }
    user.tokens.push(token);
    // Limit to last 5 tokens
    if (user.tokens.length > 5) {
      user.tokens = user.tokens.slice(-5);
    }
    await this.usersRepository.save(user);
  }
}
