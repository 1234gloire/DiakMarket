import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { WithdrawalsService } from './withdrawals.service.js';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto.js';

@ApiTags('withdrawals')
@ApiBearerAuth()
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Get('me/balance')
  getBalance(@CurrentUser() user: AuthenticatedUser) {
    return this.withdrawalsService.getBalance(user.id);
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.withdrawalsService.findMine(user.id);
  }

  @Post()
  request(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalsService.request(user.id, dto);
  }

  @Get('pending')
  @Roles('ADMIN', 'SUPER_ADMIN')
  listPending() {
    return this.withdrawalsService.listPending();
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'SUPER_ADMIN')
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.withdrawalsService.reject(id, reason);
  }
}
