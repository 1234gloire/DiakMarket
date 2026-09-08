import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import type { CreateStoreDto } from './dto/create-store.dto.js';

@Injectable()
export class StoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(ownerId: string, dto: CreateStoreDto) {
    const existing = await this.prisma.store.findUnique({ where: { ownerId } });
    if (existing) throw new BadRequestException('You already have a store');

    const store = await this.prisma.store.create({ data: { ownerId, ...dto } });
    // Owning a store grants the PRO_SELLER role (drives storefront perks per §4.3).
    await this.prisma.user.update({
      where: { id: ownerId },
      data: { roles: { push: 'PRO_SELLER' } },
    });
    return store;
  }

  findBySlug(slug: string) {
    return this.prisma.store.findUniqueOrThrow({ where: { slug }, include: { country: true } });
  }

  findByCountry(countryId: string) {
    return this.prisma.store.findMany({ where: { countryId, isActive: true }, orderBy: { name: 'asc' } });
  }

  getLogoUploadSignature(ownerId: string) {
    return this.cloudinary.createSignedUploadParams(`diakmarket/stores/${ownerId}`);
  }

  async follow(storeId: string, userId: string) {
    return this.prisma.storeFollower.upsert({
      where: { storeId_userId: { storeId, userId } },
      create: { storeId, userId },
      update: {},
    });
  }

  async unfollow(storeId: string, userId: string) {
    await this.prisma.storeFollower.deleteMany({ where: { storeId, userId } });
  }

  async assertOwner(storeId: string, ownerId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    if (store.ownerId !== ownerId) throw new BadRequestException('You do not own this store');
    return store;
  }
}
