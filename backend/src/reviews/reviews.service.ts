import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true, delivery: { include: { courier: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== 'COMPLETED') throw new BadRequestException('You can only review a completed order');

    this.assertPartiesMatch(order, authorId, dto);

    const review = await this.prisma.review.create({
      data: {
        orderId: dto.orderId,
        productId: dto.productId,
        type: dto.type,
        authorId,
        targetId: dto.targetId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.recomputeRating(dto.targetId);
    return review;
  }

  findForUser(targetId: string) {
    return this.prisma.review.findMany({
      where: { targetId },
      include: { author: { select: { id: true, profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private assertPartiesMatch(
    order: { buyerId: string; items: { sellerId: string }[]; delivery: { courier: { userId: string } | null } | null },
    authorId: string,
    dto: CreateReviewDto,
  ) {
    const sellerIds = order.items.map((i) => i.sellerId);

    switch (dto.type) {
      case 'BUYER_TO_SELLER':
        if (authorId !== order.buyerId) throw new ForbiddenException('Only the buyer can leave this review');
        if (!sellerIds.includes(dto.targetId)) throw new BadRequestException('targetId is not a seller on this order');
        return;
      case 'SELLER_TO_BUYER':
        if (!sellerIds.includes(authorId)) throw new ForbiddenException('Only a seller on this order can leave this review');
        if (dto.targetId !== order.buyerId) throw new BadRequestException('targetId must be the buyer');
        return;
      case 'BUYER_TO_COURIER':
        if (authorId !== order.buyerId) throw new ForbiddenException('Only the buyer can leave this review');
        if (!order.delivery?.courier || order.delivery.courier.userId !== dto.targetId) {
          throw new BadRequestException('targetId must be the courier who delivered this order');
        }
        return;
    }
  }

  private async recomputeRating(userId: string) {
    const agg = await this.prisma.review.aggregate({ where: { targetId: userId }, _avg: { rating: true }, _count: true });
    await this.prisma.profile.update({
      where: { userId },
      data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
    });
  }
}
