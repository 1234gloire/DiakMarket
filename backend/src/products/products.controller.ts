import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductsDto } from './dto/query-products.dto.js';
import { RegisterProductImageDto } from './dto/register-product-image.dto.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  findMany(@Query() query: QueryProductsDto) {
    return this.productsService.findMany(query);
  }

  @ApiBearerAuth()
  @Get('me/upload-signature')
  getUploadSignature(@CurrentUser() user: AuthenticatedUser) {
    return this.productsService.getUploadSignature(user.id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @ApiBearerAuth()
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.id, dto);
  }

  @ApiBearerAuth()
  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/publish')
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.publish(id, user.id);
  }

  @ApiBearerAuth()
  @Post(':id/archive')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.archive(id, user.id);
  }

  @ApiBearerAuth()
  @Post(':id/images')
  addImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterProductImageDto,
  ) {
    return this.productsService.addImage(id, user.id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id/images/:imageId')
  removeImage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.productsService.removeImage(id, imageId, user.id);
  }
}
