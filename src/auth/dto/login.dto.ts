import { IsString, IsEmail, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'Email or phone' })
  @IsString()
  identifier: string;

  @ApiProperty()
  @IsString()
  password: string;
}