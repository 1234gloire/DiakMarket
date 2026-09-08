import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { OrderStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * The order state machine (cahier des charges §15). Every transition is validated against
 * this graph and recorded in OrderStatusHistory — the order's `status` column is a
 * denormalized read of the latest history row, never the source of truth on its own.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.SELLER_CONFIRMED, OrderStatus.CANCELLED, OrderStatus.DISPUTED, OrderStatus.REFUNDED],
  [OrderStatus.SELLER_CONFIRMED]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED, OrderStatus.DISPUTED],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED, OrderStatus.DISPUTED],
  [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT, OrderStatus.DISPUTED],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.DISPUTED],
  [OrderStatus.DELIVERED]: [OrderStatus.BUYER_CONFIRMED, OrderStatus.DISPUTED, OrderStatus.RETURN_REQUESTED],
  [OrderStatus.BUYER_CONFIRMED]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [OrderStatus.DISPUTED],
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.DISPUTED]: [
    OrderStatus.REFUNDED,
    OrderStatus.RETURN_REQUESTED,
    OrderStatus.RETURNED,
    OrderStatus.DELIVERED,
    OrderStatus.BUYER_CONFIRMED,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.RETURN_REQUESTED]: [OrderStatus.RETURNED, OrderStatus.DISPUTED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
};

export interface TransitionOptions {
  changedById?: string | null;
  reason?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class OrderStatusService {
  constructor(private readonly prisma: PrismaService) {}

  canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
  }

  /** Applies a validated transition and appends the audit trail row, atomically. */
  async transition(orderId: string, toStatus: OrderStatus, options: TransitionOptions = {}) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });

      if (!this.canTransition(order.status, toStatus)) {
        throw new BadRequestException(`Cannot move order from ${order.status} to ${toStatus}`);
      }

      const updated = await tx.order.update({ where: { id: orderId }, data: { status: toStatus } });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus,
          changedById: options.changedById ?? null,
          reason: options.reason,
          metadata: options.metadata,
        },
      });

      return updated;
    });
  }
}
