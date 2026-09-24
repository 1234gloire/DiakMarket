import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { DeliveriesService } from './deliveries.service.js';
import { MarkPickedUpDto } from './dto/mark-picked-up.dto.js';
import { ConfirmDeliveryDto } from './dto/confirm-delivery.dto.js';

@ApiTags('deliveries')
@ApiBearerAuth()
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('by-order/:orderId')
  findByOrder(@CurrentUser() user: AuthenticatedUser, @Param('orderId') orderId: string) {
    return this.deliveriesService.findByOrder(orderId, user);
  }

  @Get('open/nearby')
  listOpenNearby(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveriesService.listOpenNearby(user.id);
  }

  @Post(':id/claim')
  claim(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveriesService.claim(id, user.id);
  }

  @Patch(':id/picked-up')
  markPickedUp(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: MarkPickedUpDto) {
    return this.deliveriesService.markPickedUp(id, user.id, dto);
  }

  @Patch(':id/start-transit')
  startTransit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveriesService.startTransit(id, user.id);
  }

  @Patch(':id/confirm')
  confirmDelivery(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ConfirmDeliveryDto) {
    return this.deliveriesService.confirmDelivery(id, user.id, dto);
  }
}
