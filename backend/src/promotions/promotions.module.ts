import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller.js';
import { PromotionsService } from './promotions.service.js';
import { StoresModule } from '../stores/stores.module.js';

@Module({
  imports: [StoresModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
})
export class PromotionsModule {}
