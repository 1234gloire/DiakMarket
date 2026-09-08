import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { DeliveriesService } from './deliveries.service.js';

@ApiTags('deliveries')
@ApiBearerAuth()
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('by-order/:orderId')
  findByOrder(@CurrentUser() user: AuthenticatedUser, @Param('orderId') orderId: string) {
    return this.deliveriesService.findByOrder(orderId, user);
  }
}
