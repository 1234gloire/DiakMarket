import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { CouriersService } from './couriers.service.js';
import { RegisterCourierDto } from './dto/register-courier.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';

@ApiTags('couriers')
@ApiBearerAuth()
@Controller('couriers')
export class CouriersController {
  constructor(private readonly couriersService: CouriersService) {}

  @Post('me')
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterCourierDto) {
    return this.couriersService.register(user.id, dto);
  }

  @Get('me')
  getMine(@CurrentUser() user: AuthenticatedUser) {
    return this.couriersService.getMine(user.id);
  }

  @Patch('me/availability')
  setAvailability(@CurrentUser() user: AuthenticatedUser, @Body('isAvailable') isAvailable: boolean) {
    return this.couriersService.setAvailability(user.id, isAvailable);
  }

  @Patch('me/location')
  updateLocation(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateLocationDto) {
    return this.couriersService.updateLocation(user.id, dto);
  }

  @Patch(':id/verify')
  @Roles('ADMIN', 'SUPER_ADMIN')
  verify(@Param('id') id: string) {
    return this.couriersService.verify(id);
  }
}
