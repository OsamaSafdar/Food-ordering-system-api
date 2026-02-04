import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PlaceOrderDto } from './dto/order.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('orders')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post('place')
  async placeOrder(@Req() req, @Body() placeDto: PlaceOrderDto) {
    return this.ordersService.placeOrder(req.user, placeDto);
  }

  @Get()
  async getOrders(@Req() req) {
    return this.ordersService.getOrders(req.user);
  }
}