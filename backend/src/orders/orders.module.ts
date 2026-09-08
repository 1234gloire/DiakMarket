import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { OrderStatusService } from '../order-status/order-status.service.js';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderStatusService],
  exports: [OrderStatusService],
})
export class OrdersModule {}
