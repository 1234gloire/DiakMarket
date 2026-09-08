import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { CartsService } from './carts.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';

@ApiTags('carts')
@ApiBearerAuth()
@Controller('carts/me')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  getMyCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartsService.getMyCart(user.id);
  }

  @Post('items')
  addItem(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddCartItemDto) {
    return this.cartsService.addItem(user.id, dto.productId, dto.quantity);
  }

  @Delete('items/:productId')
  removeItem(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.cartsService.removeItem(user.id, productId);
  }
}
