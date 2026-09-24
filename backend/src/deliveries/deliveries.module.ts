import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller.js';
import { DeliveriesService } from './deliveries.service.js';
import { PostGisModule } from './postgis.module.js';
import { OrderStatusModule } from '../order-status/order-status.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [OrderStatusModule, NotificationsModule, PostGisModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
