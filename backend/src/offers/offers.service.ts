import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateOfferDto } from './dto/create-offer.dto.js';
import { OfferResponseAction, type RespondOfferDto } from './dto/respond-offer.dto.js';

const OFFER_EXPIRY_HOURS = 48;
const MAX_COUNTER_DEPTH = 20; // guards against pathological chains when walking parentOfferId

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(buyerId: string, dto: CreateOfferDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product || product.status !== 'ACTIVE') throw new NotFoundException('Product not available');
    if (product.sellerId === buyerId) throw new BadRequestException('You cannot make an offer on your own product');

    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000);

    return this.prisma.offer.create({
      data: {
        productId: product.id,
        buyerId,
        sellerId: product.sellerId,
        amount: dto.amount,
        currencyCode: product.currencyCode,
        expiresAt,
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.offer.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      include: { product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respond(offerId: string, actingUserId: string, dto: RespondOfferDto) {
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.status !== 'PENDING') throw new BadRequestException('This offer is no longer pending');
    if (offer.expiresAt < new Date()) {
      await this.prisma.offer.update({ where: { id: offerId }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('This offer has expired');
    }

    const responder = await this.resolveResponder(offer);
    if (responder !== actingUserId) {
      throw new ForbiddenException('It is not your turn to respond to this offer');
    }

    switch (dto.action) {
      case OfferResponseAction.ACCEPT:
        return this.prisma.offer.update({ where: { id: offerId }, data: { status: 'ACCEPTED' } });

      case OfferResponseAction.REJECT:
        return this.prisma.offer.update({ where: { id: offerId }, data: { status: 'REJECTED' } });

      case OfferResponseAction.COUNTER: {
        if (!dto.counterAmount) throw new BadRequestException('counterAmount is required');
        return this.prisma.$transaction(async (tx) => {
          await tx.offer.update({ where: { id: offerId }, data: { status: 'COUNTERED' } });
          return tx.offer.create({
            data: {
              productId: offer.productId,
              buyerId: offer.buyerId,
              sellerId: offer.sellerId,
              amount: dto.counterAmount!,
              currencyCode: offer.currencyCode,
              parentOfferId: offer.id,
              expiresAt: new Date(Date.now() + OFFER_EXPIRY_HOURS * 60 * 60 * 1000),
            },
          });
        });
      }
    }
  }

  /**
   * The buyer always proposes the original offer, so the seller must respond to it. Every
   * counter-offer flips whose turn it is — walk the parentOfferId chain to find the parity.
   */
  private async resolveResponder(offer: { id: string; parentOfferId: string | null; buyerId: string; sellerId: string }) {
    let depth = 0;
    let currentParentId = offer.parentOfferId;
    while (currentParentId && depth < MAX_COUNTER_DEPTH) {
      const parent = await this.prisma.offer.findUnique({
        where: { id: currentParentId },
        select: { parentOfferId: true },
      });
      if (!parent) break;
      currentParentId = parent.parentOfferId;
      depth += 1;
    }
    // depth 0 -> proposed by buyer -> seller responds; each extra hop flips it.
    return depth % 2 === 0 ? offer.sellerId : offer.buyerId;
  }
}
