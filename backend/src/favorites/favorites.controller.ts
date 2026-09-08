import { Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { FavoritesService } from './favorites.service.js';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.favoritesService.findMine(user.id);
  }

  @Post(':productId')
  add(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.favoritesService.add(user.id, productId);
  }

  @Delete(':productId')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('productId', ParseUUIDPipe) productId: string) {
    return this.favoritesService.remove(user.id, productId);
  }
}
