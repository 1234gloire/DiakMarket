import { Module } from '@nestjs/common';
import { CouriersController } from './couriers.controller.js';
import { CouriersService } from './couriers.service.js';
import { PostGisModule } from '../deliveries/postgis.module.js';

@Module({
  imports: [PostGisModule],
  controllers: [CouriersController],
  providers: [CouriersService],
})
export class CouriersModule {}
