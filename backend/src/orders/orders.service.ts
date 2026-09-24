import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderStatusService } from '../order-status/order-status.service.js';
import { DeliveriesService } from '../deliveries/deliveries.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import type { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

const ORDER_INCLUDE = {
  items: { include: { product: { include: { images: { take: 1, orderBy: { sortOrder: 'asc' as const } } } } } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  shippingAddress: true,
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStatus: OrderStatusService,
    private readonly deliveries: DeliveriesService,
  ) {}

  async checkout(buyerId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: buyerId },
      include: { items: { include: { product: true } } },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Your cart is empty');

    let shippingAddress: { countryId: string } | null = null;
    if (dto.deliveryMode === 'HOME_DELIVERY') {
      if (!dto.shippingAddressId) throw new BadRequestException('shippingAddressId is required for home delivery');
      const address = await this.prisma.address.findUnique({ where: { id: dto.shippingAddressId } });
      if (!address || address.userId !== buyerId) throw new BadRequestException('Invalid shipping address');
      shippingAddress = address;
    }

    for (const item of cart.items) {
      if (item.product.status !== 'ACTIVE') {
        throw new BadRequestException(`"${item.product.title}" is no longer available`);
      }
      if (item.quantity > item.product.quantity) {
        throw new BadRequestException(`Not enough stock for "${item.product.title}"`);
      }
    }

    const currencies = new Set(cart.items.map((i) => i.product.currencyCode));
    if (currencies.size > 1) {
      // Never mix currencies (e.g. XOF and XAF) in a single order/settlement.
      throw new BadRequestException('All items in an order must share the same currency — checkout separately per country');
    }
    const currencyCode = [...currencies][0];

    const itemsTotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    // Estimate only (the base fee for the buyer's country) — the precise, distance-based
    // courier payout is computed separately per Delivery once one is dispatched (§40: the
    // platform is allowed a margin between what the buyer pays here and what the courier earns).
    const deliveryFee = shippingAddress ? await this.estimateDeliveryFee(shippingAddress.countryId) : 0;
    // TODO(Phase 5 — Payments/Commissions): compute from a configurable buyer-protection rule instead of 0.
    const buyerProtectionFee = 0;
    const discountTotal = 0;
    const otherFees = 0;
    const grandTotal = itemsTotal + deliveryFee + buyerProtectionFee - discountTotal + otherFees;

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new BadRequestException(`"${item.product.title}" went out of stock`);
        }
      }

      const created = await tx.order.create({
        data: {
          buyerId,
          shippingAddressId: dto.shippingAddressId,
          deliveryMode: dto.deliveryMode,
          currencyCode,
          itemsTotal,
          deliveryFee,
          buyerProtectionFee,
          discountTotal,
          otherFees,
          grandTotal,
          status: OrderStatus.PENDING_PAYMENT,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              sellerId: item.product.sellerId,
              quantity: item.quantity,
              unitPrice: item.product.price,
              currencyCode: item.product.currencyCode,
            })),
          },
        },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: created.id, fromStatus: null, toStatus: OrderStatus.PENDING_PAYMENT, changedById: buyerId },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // Re-fetch with the full include so the response reflects everything just written above
      // (statusHistory in particular — `order.create`'s own `include` would only snapshot state
      // as of the create call, before the history row existed).
      return tx.order.findUniqueOrThrow({ where: { id: created.id }, include: ORDER_INCLUDE });
    });

    return order;
  }

  async findMine(buyerId: string) {
    return this.prisma.order.findMany({
      where: { buyerId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMySales(sellerId: string) {
    return this.prisma.order.findMany({
      where: { items: { some: { sellerId } } },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException('Order not found');
    this.assertCanView(order, user);
    return order;
  }

  async updateStatus(id: string, user: AuthenticatedUser, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');

    this.authorizeTransition(order, user, dto.toStatus);

    const updated = await this.orderStatus.transition(id, dto.toStatus, {
      changedById: user.id,
      reason: dto.reason,
    });

    if (dto.toStatus === OrderStatus.READY_FOR_PICKUP) {
      // Kicks off dispatch (§20) for HOME_DELIVERY orders — a no-op for PICKUP_POINT/HAND_TO_HAND.
      await this.deliveries.createForOrder(id);
    }

    if (dto.toStatus === OrderStatus.BUYER_CONFIRMED) {
      // Buyer confirmation immediately finalizes the order.
      // TODO(Phase 5 — Ledger/Commissions/Settlements): post the seller payout here.
      return this.orderStatus.transition(id, OrderStatus.COMPLETED, {
        changedById: user.id,
        reason: 'Auto-completed after buyer confirmation',
      });
    }

    return updated;
  }

  private async estimateDeliveryFee(countryId: string): Promise<number> {
    const rule = await this.prisma.deliveryPricingRule.findFirst({
      where: { isActive: true, deliveryZone: { countryId, isActive: true } },
      orderBy: { createdAt: 'asc' },
    });
    return rule?.baseFee ?? 0;
  }

  private assertCanView(order: { buyerId: string; items: { sellerId: string }[] }, user: AuthenticatedUser) {
    if (user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN')) return;
    if (order.buyerId === user.id) return;
    if (order.items.some((item) => item.sellerId === user.id)) return;
    throw new ForbiddenException('You do not have access to this order');
  }

  private authorizeTransition(
    order: { buyerId: string; items: { sellerId: string }[] },
    user: AuthenticatedUser,
    toStatus: OrderStatus,
  ) {
    const isAdmin = user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN');
    const isBuyer = order.buyerId === user.id;
    const isSeller = order.items.some((item) => item.sellerId === user.id);

    if (isAdmin) return;

    switch (toStatus) {
      case OrderStatus.PAID:
        // Set exclusively by the payments webhook handler (trusted internal call), never by a
        // user request — see PaymentsModule. An admin override is still allowed above.
        throw new ForbiddenException('Payment confirmation is handled by the payment provider webhook');
      case OrderStatus.SELLER_CONFIRMED:
      case OrderStatus.READY_FOR_PICKUP:
        if (!isSeller) throw new ForbiddenException('Only the seller can perform this transition');
        return;
      case OrderStatus.PICKED_UP:
      case OrderStatus.IN_TRANSIT:
      case OrderStatus.DELIVERED:
        // Set exclusively via QR scan / OTP confirmation on the assigned delivery, never a bare
        // status PATCH — see DeliveriesController (picked-up / start-transit / confirm). An
        // admin override is still allowed above.
        throw new ForbiddenException('This transition is handled by the delivery QR/OTP endpoints, not a direct status update');
      case OrderStatus.BUYER_CONFIRMED:
      case OrderStatus.RETURN_REQUESTED:
        if (!isBuyer) throw new ForbiddenException('Only the buyer can perform this transition');
        return;
      case OrderStatus.CANCELLED:
        if (!isBuyer && !isSeller) throw new ForbiddenException('Only the buyer or seller can cancel this order');
        return;
      case OrderStatus.DISPUTED:
        if (!isBuyer) throw new ForbiddenException('Open a dispute via the disputes endpoint instead');
        return;
      default:
        throw new ForbiddenException('This transition requires an administrator');
    }
  }
}
