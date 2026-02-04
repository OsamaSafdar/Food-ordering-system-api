import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsString()
  variant: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsString()
  variant: string;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  quantity?: number;
}