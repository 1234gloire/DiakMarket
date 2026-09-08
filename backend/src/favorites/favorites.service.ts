import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, productId: string) {
    return this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  }

  async remove(userId: string, productId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, productId } });
  }

  findMine(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: { product: { include: { images: { orderBy: { sortOrder: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
