import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ description: 'Email or phone' })
  @IsString()
  identifier: string;
}

export class VerifyOtpDto extends SendOtpDto {
  @ApiProperty()
  @IsString()
  otp: string;
}