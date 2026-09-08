import { Module } from '@nestjs/common';
import { CommissionsController } from './commissions.controller.js';
import { CommissionsService } from './commissions.service.js';

@Module({
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
