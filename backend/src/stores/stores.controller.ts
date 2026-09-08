import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { StoresService } from './stores.service.js';
import { CreateStoreDto } from './dto/create-store.dto.js';

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @ApiBearerAuth()
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStoreDto) {
    return this.storesService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Get('me/logo-upload-signature')
  getLogoUploadSignature(@CurrentUser() user: AuthenticatedUser) {
    return this.storesService.getLogoUploadSignature(user.id);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.storesService.findBySlug(slug);
  }

  @ApiBearerAuth()
  @Post(':id/follow')
  follow(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.storesService.follow(id, user.id);
  }

  @ApiBearerAuth()
  @Delete(':id/follow')
  unfollow(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.storesService.unfollow(id, user.id);
  }
}
