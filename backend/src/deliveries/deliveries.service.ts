import { createHash, randomInt, randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PostGisService } from './postgis.service.js';
import { OrderStatusService } from '../order-status/order-status.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { DeliveryStatus, OrderStatus } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { MarkPickedUpDto } from './dto/mark-picked-up.dto.js';
import type { ConfirmDeliveryDto } from './dto/confirm-delivery.dto.js';

const OTP_VALIDITY_MS = 2 * 60 * 60 * 1000; // 2h — long enough for hand-to-hand handoff timing
const SEARCH_RADIUS_METERS = 15_000; // 15km — flat default; per-country tuning is a later refinement

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postgis: PostGisService,
    private readonly orderStatus: OrderStatusService,
    private readonly notifications: NotificationsService,
  ) {}

  async findByOrder(orderId: string, user: AuthenticatedUser) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
      include: { order: { include: { items: true } }, courier: { include: { user: { select: { id: true, profile: true } } } } },
    });
    if (!delivery) throw new NotFoundException('No delivery yet for this order');
    this.assertParty(delivery, user);
    return delivery;
  }

  /**
   * Called by OrdersService right after an order reaches READY_FOR_PICKUP (§20). Only
   * HOME_DELIVERY needs a dispatched courier — PICKUP_POINT/HAND_TO_HAND don't create one.
   */
  async createForOrder(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { product: true } }, shippingAddress: true },
    });
    if (order.deliveryMode !== 'HOME_DELIVERY') return null;

    const existing = await this.prisma.delivery.findUnique({ where: { orderId } });
    if (existing) return existing;

    const pickupProduct = order.items[0]?.product;
    const pickupLat = pickupProduct?.latitude ?? null;
    const pickupLng = pickupProduct?.longitude ?? null;
    const dropoffLat = order.shippingAddress?.latitude ?? null;
    const dropoffLng = order.shippingAddress?.longitude ?? null;

    const courierFee = await this.computeCourierFee(order.shippingAddress?.countryId, pickupLat, pickupLng, dropoffLat, dropoffLng);

    return this.prisma.delivery.create({
      data: {
        orderId,
        mode: order.deliveryMode,
        status: DeliveryStatus.SEARCHING_COURIER,
        qrCode: randomUUID(),
        pickupLatitude: pickupLat,
        pickupLongitude: pickupLng,
        dropoffLatitude: dropoffLat,
        dropoffLongitude: dropoffLng,
        courierFee,
        currencyCode: order.currencyCode,
        proposedAt: new Date(),
      },
    });
  }

  /** Deliveries waiting for a courier, near the calling courier's last known position — a
   * first-come-first-served job board rather than a push-one-courier-then-wait dispatch (that
   * needs delayed-job infrastructure — BullMQ is wired but no queue uses it yet; this is the
   * pragmatic v1). */
  async listOpenNearby(courierUserId: string) {
    const courier = await this.prisma.courier.findUniqueOrThrow({ where: { userId: courierUserId } });
    const location = await this.postgis.getCourierLastLocation(courier.id);
    if (!location) throw new BadRequestException('Share your location before browsing available deliveries');

    const nearby = await this.postgis.findOpenDeliveriesNear(location.latitude, location.longitude, SEARCH_RADIUS_METERS);
    if (nearby.length === 0) return [];

    const deliveries = await this.prisma.delivery.findMany({
      where: { id: { in: nearby.map((n) => n.deliveryId) } },
      include: { order: { include: { items: { include: { product: true } } } } },
    });
    const distanceById = new Map(nearby.map((n) => [n.deliveryId, n.distanceMeters]));
    return deliveries
      .map((d) => ({ ...d, distanceMeters: distanceById.get(d.id) ?? null }))
      .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  }

  /** Atomic claim: the status-guarded updateMany means only the first courier to call this for
   * a given delivery succeeds, even under concurrent requests. */
  async claim(deliveryId: string, courierUserId: string) {
    const courier = await this.prisma.courier.findUniqueOrThrow({ where: { userId: courierUserId } });
    if (!courier.isAvailable) throw new BadRequestException('Set yourself available before accepting a delivery');

    const result = await this.prisma.delivery.updateMany({
      where: { id: deliveryId, status: DeliveryStatus.SEARCHING_COURIER },
      data: { status: DeliveryStatus.ASSIGNED, courierId: courier.id, acceptedAt: new Date() },
    });
    if (result.count === 0) throw new BadRequestException('This delivery is no longer available');
    return this.prisma.delivery.findUniqueOrThrow({ where: { id: deliveryId } });
  }

  async markPickedUp(deliveryId: string, courierUserId: string, dto: MarkPickedUpDto) {
    const delivery = await this.getOwnedByCourier(deliveryId, courierUserId);
    if (delivery.status !== DeliveryStatus.ASSIGNED) {
      throw new BadRequestException(`Cannot pick up a delivery in status ${delivery.status}`);
    }
    if (delivery.qrCode !== dto.qrCode) throw new BadRequestException('QR code does not match this delivery');

    await this.prisma.delivery.update({ where: { id: deliveryId }, data: { status: DeliveryStatus.PICKED_UP, pickedUpAt: new Date() } });
    await this.orderStatus.transition(delivery.orderId, OrderStatus.PICKED_UP, {
      changedById: courierUserId,
      reason: 'QR code scanned by courier',
    });
    return this.prisma.delivery.findUniqueOrThrow({ where: { id: deliveryId } });
  }

  /** Marks the parcel in transit and issues a fresh OTP, delivered to the buyer only via their
   * notification feed (never returned to the courier, never stored in plaintext — §21). */
  async startTransit(deliveryId: string, courierUserId: string) {
    const delivery = await this.getOwnedByCourier(deliveryId, courierUserId);
    if (delivery.status !== DeliveryStatus.PICKED_UP) {
      throw new BadRequestException(`Cannot start transit for a delivery in status ${delivery.status}`);
    }

    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: delivery.orderId } });
    const otp = randomInt(100_000, 1_000_000).toString();
    const codeHash = createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + OTP_VALIDITY_MS);

    await this.prisma.$transaction([
      this.prisma.delivery.update({ where: { id: deliveryId }, data: { status: DeliveryStatus.IN_TRANSIT, otpCodeHash: codeHash } }),
      this.prisma.otpCode.create({
        data: { purpose: 'DELIVERY_CONFIRMATION', userId: order.buyerId, deliveryId, codeHash, expiresAt },
      }),
    ]);

    await this.notifications.create(
      order.buyerId,
      'DELIVERY_IN_PROGRESS',
      'Votre colis est en route',
      `Donnez ce code au livreur pour confirmer la réception : ${otp}`,
      { otp, deliveryId, orderId: delivery.orderId },
    );

    await this.orderStatus.transition(delivery.orderId, OrderStatus.IN_TRANSIT, {
      changedById: courierUserId,
      reason: 'Courier started transit',
    });
    return this.prisma.delivery.findUniqueOrThrow({ where: { id: deliveryId } });
  }

  async confirmDelivery(deliveryId: string, courierUserId: string, dto: ConfirmDeliveryDto) {
    const delivery = await this.getOwnedByCourier(deliveryId, courierUserId);
    if (delivery.status !== DeliveryStatus.IN_TRANSIT) {
      throw new BadRequestException(`Cannot confirm a delivery in status ${delivery.status}`);
    }

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: { deliveryId, purpose: 'DELIVERY_CONFIRMATION', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otpRecord) throw new BadRequestException('No active confirmation code for this delivery');
    if (otpRecord.expiresAt < new Date()) throw new BadRequestException('Confirmation code has expired');
    if (otpRecord.attempts >= otpRecord.maxAttempts) throw new BadRequestException('Too many incorrect attempts');

    const hash = createHash('sha256').update(dto.otpCode).digest('hex');
    if (hash !== otpRecord.codeHash) {
      await this.prisma.otpCode.update({ where: { id: otpRecord.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Incorrect confirmation code');
    }

    await this.prisma.$transaction([
      this.prisma.otpCode.update({ where: { id: otpRecord.id }, data: { consumedAt: new Date() } }),
      this.prisma.delivery.update({ where: { id: deliveryId }, data: { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() } }),
    ]);
    await this.orderStatus.transition(delivery.orderId, OrderStatus.DELIVERED, {
      changedById: courierUserId,
      reason: 'Confirmation code verified by courier',
    });
    return this.prisma.delivery.findUniqueOrThrow({ where: { id: deliveryId } });
  }

  private async computeCourierFee(
    countryId: string | null | undefined,
    pickupLat: number | null,
    pickupLng: number | null,
    dropoffLat: number | null,
    dropoffLng: number | null,
  ): Promise<number> {
    if (!countryId) return 0;
    const rule = await this.prisma.deliveryPricingRule.findFirst({
      where: { isActive: true, deliveryZone: { countryId, isActive: true } },
      orderBy: { createdAt: 'asc' },
    });
    if (!rule) return 0; // TODO(zones not configured for this country yet): falls back to free delivery rather than guessing a price.

    let fee = rule.baseFee;
    if (pickupLat !== null && pickupLng !== null && dropoffLat !== null && dropoffLng !== null) {
      const distanceKm = (await this.postgis.distanceMeters(pickupLat, pickupLng, dropoffLat, dropoffLng)) / 1000;
      fee += Math.round(distanceKm * rule.perKmFee);
    }
    fee = Math.max(fee, rule.minFee);
    if (rule.maxFee !== null) fee = Math.min(fee, rule.maxFee);
    return fee;
  }

  private async getOwnedByCourier(deliveryId: string, courierUserId: string) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id: deliveryId }, include: { courier: true } });
    if (!delivery) throw new NotFoundException('Delivery not found');
    if (delivery.courier?.userId !== courierUserId) throw new ForbiddenException('This delivery is not assigned to you');
    return delivery;
  }

  private assertParty(
    delivery: { order: { buyerId: string; items: { sellerId: string }[] }; courier: { userId: string } | null },
    user: AuthenticatedUser,
  ) {
    const isParty =
      delivery.order.buyerId === user.id ||
      delivery.order.items.some((item) => item.sellerId === user.id) ||
      delivery.courier?.userId === user.id;
    const isAdmin = user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN');
    if (!isParty && !isAdmin) throw new ForbiddenException('You do not have access to this delivery');
  }
}
