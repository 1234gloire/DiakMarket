import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { UserStatus } from '../generated/prisma/enums.js';
import { AdminService } from './admin.service.js';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto.js';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(@Query() query: PaginationQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:id/roles')
  @Roles('SUPER_ADMIN')
  updateRoles(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateUserRolesDto) {
    return this.adminService.updateUserRoles(admin.id, id, dto.roles);
  }

  @Patch('users/:id/status')
  updateStatus(@CurrentUser() admin: AuthenticatedUser, @Param('id') id: string, @Body('status') status: UserStatus) {
    return this.adminService.updateUserStatus(admin.id, id, status);
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: PaginationQueryDto) {
    return this.adminService.listAuditLogs(query);
  }
}
