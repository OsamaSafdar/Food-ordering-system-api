import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  async findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async create(@Body() createDto: CreateProductDto, @Req() req) {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admin access required');
    return this.productsService.create(createDto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() updateDto: UpdateProductDto, @Req() req) {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admin access required');
    return this.productsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  async delete(@Param('id') id: string, @Req() req) {
    if (req.user.role !== 'admin') throw new UnauthorizedException('Admin access required');
    return this.productsService.delete(id);
  }
}