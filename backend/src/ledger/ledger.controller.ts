import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { LedgerService } from './ledger.service.js';

@ApiTags('ledger')
@ApiBearerAuth()
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('me/transactions')
  getMyTransactions(@CurrentUser() user: AuthenticatedUser) {
    return this.ledgerService.getMyTransactions(user.id);
  }
}
