import { Module } from '@nestjs/common';
import { CouriersController } from './couriers.controller.js';
import { CouriersService } from './couriers.service.js';

@Module({
  controllers: [CouriersController],
  providers: [CouriersService],
})
export class CouriersModule {}
