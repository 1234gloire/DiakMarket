import { Module } from '@nestjs/common';
import { PostGisService } from './postgis.service.js';

/** Shared by DeliveriesModule (dispatch/open-deliveries search) and CouriersModule (recording a
 * courier's own position) — standalone so neither has to import the other. */
@Module({
  providers: [PostGisService],
  exports: [PostGisService],
})
export class PostGisModule {}
