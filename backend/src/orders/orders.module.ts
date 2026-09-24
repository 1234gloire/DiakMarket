import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { OrderStatusModule } from '../order-status/order-status.module.js';
import { DeliveriesModule } from '../deliveries/deliveries.module.js';

// No cycle: DeliveriesModule depends on OrderStatusModule (not this module), so OrdersModule can
// safely depend on DeliveriesModule to create a Delivery when an order reaches READY_FOR_PICKUP.
@Module({
  imports: [OrderStatusModule, DeliveriesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrderStatusModule],
})
export class OrdersModule {}
