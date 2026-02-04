import * as crypto from 'crypto';

export function generateOtp(length = 6): string {
  return crypto.randomBytes(length / 2).toString('hex').toUpperCase();
}

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}