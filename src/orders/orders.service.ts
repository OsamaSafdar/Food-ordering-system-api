import { Inject,Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from '../models/order.entity';
import { User } from '../models/user.entity';
import { Cart } from '../models/cart.entity';
import { CartService } from '../cart/cart.service';
import { PlaceOrderDto } from './dto/order.dto';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepo: Repository<Order>,
    @InjectRepository(Cart)
    private cartRepo: Repository<Cart>,
    private cartService: CartService,
    private dataSource: DataSource,
    @Inject('ORDER_QUEUE') private orderQueue: ClientProxy,
  ) {}

  async placeOrder(user: User, dto: PlaceOrderDto): Promise<Order> {
    const cart = await this.cartService.getCart(user);
    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    return this.dataSource.transaction<Order>(async (manager) => {
      const order = this.ordersRepo.create({
        user,
        items: [...cart.items],
        total: cart.total,
        paymentType: dto.paymentType,
        status: 'pending',
      });

      const savedOrder = await manager.save(order);

      const cartEntity = await manager.findOne(Cart, {
        where: { user: { id: user.id } },
      });

      if (cartEntity) {
        cartEntity.items = [];
        cartEntity.total = 0;
        await manager.save(cartEntity);
      }

      this.orderQueue.emit('process_order', {
        orderId: savedOrder.id,
        userEmail: user.email,
        userPhone: user.phone,
      });

      return savedOrder;
    });
  }

  async getOrders(user: User): Promise<Order[]> {
    return this.ordersRepo.find({ where: { user: { id: user.id } } });
  }

  async updateStatus(id: string, status: string): Promise<Order> {
    const order = await this.ordersRepo.findOneBy({ id });
    if (!order) throw new Error('Order not found');
    order.status = status;
    return this.ordersRepo.save(order);
  }
}