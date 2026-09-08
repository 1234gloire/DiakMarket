import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import type { CreatePromotionDto } from './dto/create-promotion.dto.js';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
  ) {}

  async create(storeId: string, ownerId: string, dto: CreatePromotionDto) {
    await this.storesService.assertOwner(storeId, ownerId);
    return this.prisma.promotion.create({
      data: {
        storeId,
        type: dto.type,
        targetId: dto.targetId,
        code: dto.code,
        amount: dto.amount,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      },
    });
  }

  findActiveForStore(storeId: string) {
    return this.prisma.promotion.findMany({
      where: { storeId, isActive: true, endsAt: { gte: new Date() } },
      orderBy: { startsAt: 'desc' },
    });
  }

  async deactivate(id: string, ownerId: string) {
    const promotion = await this.prisma.promotion.findUniqueOrThrow({ where: { id } });
    if (promotion.storeId) await this.storesService.assertOwner(promotion.storeId, ownerId);
    return this.prisma.promotion.update({ where: { id }, data: { isActive: false } });
  }
}
