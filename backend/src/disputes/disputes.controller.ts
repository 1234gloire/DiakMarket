import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { DisputesService } from './disputes.service.js';
import { CreateDisputeDto } from './dto/create-dispute.dto.js';
import { AddEvidenceDto } from './dto/add-evidence.dto.js';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto.js';

@ApiTags('disputes')
@ApiBearerAuth()
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  open(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDisputeDto) {
    return this.disputesService.open(user.id, dto);
  }

  @Get('open')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'MODERATOR')
  findAllOpen() {
    return this.disputesService.findAllOpen();
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.disputesService.findOne(id, user);
  }

  @Post(':id/evidence')
  addEvidence(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddEvidenceDto) {
    return this.disputesService.addEvidence(id, user, dto);
  }

  @Patch(':id/resolve')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
  resolve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputesService.resolve(id, user.id, dto);
  }
}
