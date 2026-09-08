import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { PromotionsService } from './promotions.service.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';

@ApiTags('promotions')
@Controller('stores/:storeId/promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Public()
  @Get()
  findActive(@Param('storeId') storeId: string) {
    return this.promotionsService.findActiveForStore(storeId);
  }

  @ApiBearerAuth()
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param('storeId') storeId: string, @Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(storeId, user.id, dto);
  }

  @ApiBearerAuth()
  @Patch(':id/deactivate')
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.promotionsService.deactivate(id, user.id);
  }
}
