import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { paginate } from '../common/dto/pagination-query.dto.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import type { QueryProductsDto } from './dto/query-products.dto.js';
import type { RegisterProductImageDto } from './dto/register-product-image.dto.js';

const PRODUCT_INCLUDE = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  category: true,
  country: true,
  city: true,
  seller: { select: { id: true, profile: true } },
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  getUploadSignature(sellerId: string) {
    return this.cloudinary.createSignedUploadParams(`diakmarket/products/${sellerId}`);
  }

  /** All of the seller's own listings regardless of status (draft/active/sold/archived) — the
   * public search endpoint only ever returns ACTIVE ones. */
  findMine(sellerId: string) {
    return this.prisma.product.findMany({
      where: { sellerId },
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(sellerId: string, dto: CreateProductDto) {
    const country = await this.prisma.country.findUniqueOrThrow({ where: { id: dto.countryId } });

    return this.prisma.product.create({
      data: {
        sellerId,
        categoryId: dto.categoryId,
        countryId: dto.countryId,
        cityId: dto.cityId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        currencyCode: country.currencyCode, // derived server-side, never trust the client for money
        condition: dto.condition,
        brand: dto.brand,
        size: dto.size,
        color: dto.color,
        quantity: dto.quantity ?? 1,
        latitude: dto.latitude,
        longitude: dto.longitude,
        status: 'DRAFT',
      },
      include: PRODUCT_INCLUDE,
    });
  }

  async findMany(query: QueryProductsDto) {
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      categoryId: query.categoryId,
      countryId: query.countryId,
      cityId: query.cityId,
      sellerId: query.sellerId,
      condition: query.condition,
      brand: query.brand ? { equals: query.brand, mode: 'insensitive' } : undefined,
      price:
        query.minPrice !== undefined || query.maxPrice !== undefined
          ? { gte: query.minPrice, lte: query.maxPrice }
          : undefined,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { brand: { contains: query.search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginate(data, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, sellerId: string, dto: UpdateProductDto) {
    await this.assertOwner(id, sellerId);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: PRODUCT_INCLUDE,
    });
  }

  async publish(id: string, sellerId: string) {
    await this.assertOwner(id, sellerId);
    const imageCount = await this.prisma.productImage.count({ where: { productId: id } });
    if (imageCount === 0) {
      throw new ForbiddenException('A product needs at least one image before it can be published');
    }
    return this.prisma.product.update({ where: { id }, data: { status: 'ACTIVE' }, include: PRODUCT_INCLUDE });
  }

  async archive(id: string, sellerId: string) {
    await this.assertOwner(id, sellerId);
    return this.prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async addImage(productId: string, sellerId: string, dto: RegisterProductImageDto) {
    await this.assertOwner(productId, sellerId);

    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } });
    }

    const sortOrder = await this.prisma.productImage.count({ where: { productId } });

    return this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        publicId: dto.publicId,
        width: dto.width,
        height: dto.height,
        bytes: dto.bytes,
        isPrimary: dto.isPrimary ?? sortOrder === 0,
        sortOrder,
      },
    });
  }

  async removeImage(productId: string, imageId: string, sellerId: string) {
    await this.assertOwner(productId, sellerId);
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) throw new NotFoundException('Image not found');

    await this.prisma.productImage.delete({ where: { id: imageId } });
    await this.cloudinary.destroy(image.publicId);
  }

  private async assertOwner(productId: string, sellerId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { sellerId: true } });
    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) throw new ForbiddenException('You do not own this product');
    return product;
  }
}
