import { Module } from '@nestjs/common';
import { WithdrawalsController } from './withdrawals.controller.js';
import { WithdrawalsService } from './withdrawals.service.js';

@Module({
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService],
})
export class WithdrawalsModule {}
