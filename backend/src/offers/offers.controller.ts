import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { OffersService } from './offers.service.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { RespondOfferDto } from './dto/respond-offer.dto.js';

@ApiTags('offers')
@ApiBearerAuth()
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.offersService.findMine(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOfferDto) {
    return this.offersService.create(user.id, dto);
  }

  @Patch(':id')
  respond(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondOfferDto,
  ) {
    return this.offersService.respond(id, user.id, dto);
  }
}
