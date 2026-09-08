import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { ReportsService } from './reports.service.js';
import { CreateReportDto } from './dto/create-report.dto.js';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }

  @Get('open')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'MODERATOR')
  findOpen() {
    return this.reportsService.findOpen();
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'MODERATOR')
  updateStatus(@Param('id') id: string, @Body('status') status: 'REVIEWED' | 'DISMISSED' | 'ACTIONED') {
    return this.reportsService.updateStatus(id, status);
  }
}
