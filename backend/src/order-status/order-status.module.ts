import { Module } from '@nestjs/common';
import { OrderStatusService } from './order-status.service.js';

/** Standalone so both OrdersModule and DeliveriesModule can depend on it without a cycle
 * (OrdersModule also depends on DeliveriesModule, to create a Delivery when an order reaches
 * READY_FOR_PICKUP). */
@Module({
  providers: [OrderStatusService],
  exports: [OrderStatusService],
})
export class OrderStatusModule {}
