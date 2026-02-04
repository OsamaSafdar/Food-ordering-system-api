import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { OrdersModule } from './orders.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(OrdersModule);
  const configService = appContext.get(ConfigService);
  
  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL');
  
  if (!rabbitmqUrl) {
    console.error('RABBITMQ_URL environment variable is not set');
    process.exit(1);
  }

  const microserviceApp = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrdersModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: 'order_processing',
        queueOptions: {
          durable: true,
        },
        prefetchCount: 1,
        noAck: false,
      },
    },
  );

  await microserviceApp.listen();
  console.log(`Order processing worker is listening on RabbitMQ queue: order_processing`);
  
  await appContext.close();
}

bootstrap().catch((err) => {
  console.error('Worker bootstrap failed:', err);
  process.exit(1);
});