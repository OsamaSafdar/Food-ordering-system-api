import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlaceOrderDto {
  @ApiProperty()
  @IsString()
  paymentType: string;
}