import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersConsumer } from './orders.consumer';
import { Order } from '../models/order.entity';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    CartModule,
    ConfigModule,

    ClientsModule.registerAsync([
      {
        name: 'ORDER_QUEUE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: 'order_processing',
            queueOptions: { durable: true },
          },
        }),
      },
    ]),
  ],
  controllers: [OrdersController, OrdersConsumer],
  providers: [OrdersService],
})
export class OrdersModule {}
