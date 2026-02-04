import { Body, Controller, Delete, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('cart')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  async getCart(@Req() req) {
    return this.cartService.getCart(req.user);
  }

  @Post('add')
  async addItem(@Req() req, @Body() addDto: AddToCartDto) {
    return this.cartService.addItem(req.user, addDto);
  }

  @Put('update')
  async updateItem(@Req() req, @Body() updateDto: UpdateCartItemDto) {
    return this.cartService.updateItem(req.user, updateDto);
  }

  @Delete('remove')
  async removeItem(@Req() req, @Body() removeDto: UpdateCartItemDto) {
    return this.cartService.removeItem(req.user, removeDto);
  }

  @Delete('clear')
  async clearCart(@Req() req) {
    return this.cartService.clearCart(req.user);
  }
}