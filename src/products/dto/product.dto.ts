import { IsString, IsArray, ValidateNested, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

class VariantDto {
  @ApiProperty({ example: 'Single' })
  @IsString()
  name: string;

  @ApiProperty({ example: 5.99 })
  @IsNumber()
  price: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Burger' })
  @IsString()
  name: string;

  @ApiProperty({ type: [VariantDto], example: [{ name: 'Single', price: 5.99 }, { name: 'Double', price: 8.99 }] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}