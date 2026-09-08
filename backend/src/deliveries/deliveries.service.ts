import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

/**
 * Phase 6 (Livraison, §18-21) owns: Delivery creation when an order reaches
 * READY_FOR_PICKUP, courier dispatch via PostGIS proximity search, QR code scanning, and OTP
 * issuance/verification for the DELIVERED -> BUYER_CONFIRMED step. None of that is wired yet —
 * this module currently only exposes read access to a Delivery once one exists, so the API
 * shape (and the mobile app built against it) doesn't need to change when Phase 6 lands.
 */
@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrder(orderId: string, user: AuthenticatedUser) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
      include: { order: { include: { items: true } }, courier: { include: { user: { select: { id: true, profile: true } } } } },
    });
    if (!delivery) throw new NotFoundException('No delivery yet for this order');

    const isParty =
      delivery.order.buyerId === user.id ||
      delivery.order.items.some((item) => item.sellerId === user.id) ||
      delivery.courier?.userId === user.id;
    const isAdmin = user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN');
    if (!isParty && !isAdmin) throw new ForbiddenException('You do not have access to this delivery');

    return delivery;
  }
}
