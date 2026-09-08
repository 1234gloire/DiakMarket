import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { CommissionsService } from './commissions.service.js';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto.js';

@ApiTags('commissions')
@ApiBearerAuth()
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('rules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  listRules(@Query('countryId') countryId?: string) {
    return this.commissionsService.listRules(countryId);
  }

  @Post('rules')
  @Roles('ADMIN', 'SUPER_ADMIN')
  createRule(@Body() dto: CreateCommissionRuleDto) {
    return this.commissionsService.createRule(dto);
  }

  @Patch('rules/:id/deactivate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  deactivateRule(@Param('id') id: string) {
    return this.commissionsService.deactivateRule(id);
  }

  @Get('me')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.commissionsService.listForSeller(user.id);
  }
}
