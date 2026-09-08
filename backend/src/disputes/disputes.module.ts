import { Module } from '@nestjs/common';
import { DisputesController } from './disputes.controller.js';
import { DisputesService } from './disputes.service.js';
import { OrdersModule } from '../orders/orders.module.js';

@Module({
  imports: [OrdersModule],
  controllers: [DisputesController],
  providers: [DisputesService],
})
export class DisputesModule {}
