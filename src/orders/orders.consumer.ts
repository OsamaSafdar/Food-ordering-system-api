import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';

@Controller()
export class OrdersConsumer {
  @EventPattern('process_order')
  async handleOrderProcessing(
    @Payload() data: { orderId: string; userEmail: string; userPhone: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      console.log(
        `[Order Worker] Processing order ${data.orderId} ` +
        `for ${data.userEmail} / ${data.userPhone}`,
      );

      // we will send real email / SMS / push notification here in real flow
      // Example: await this.notificationService.sendOrderConfirmation(data);

      channel.ack(originalMsg);
    } catch (error) {
      console.error(`Failed to process order ${data.orderId}:`, error);
      channel.nack(originalMsg, false, true);
    }
  }
}