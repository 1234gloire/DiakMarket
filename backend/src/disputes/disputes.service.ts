import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderStatusService } from '../order-status/order-status.service.js';
import { OrderStatus, DisputeStatus } from '../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { CreateDisputeDto } from './dto/create-dispute.dto.js';
import type { AddEvidenceDto } from './dto/add-evidence.dto.js';
import type { ResolveDisputeDto } from './dto/resolve-dispute.dto.js';

const DISPUTABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.BUYER_CONFIRMED,
  OrderStatus.COMPLETED,
  OrderStatus.IN_TRANSIT,
];

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStatus: OrderStatusService,
  ) {}

  async open(buyerId: string, dto: CreateDisputeDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException('Only the buyer can open a dispute for this order');
    if (!DISPUTABLE_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(`Cannot open a dispute for an order in status ${order.status}`);
    }

    const dispute = await this.prisma.dispute.create({
      data: { orderId: dto.orderId, openedById: buyerId, reason: dto.reason, description: dto.description },
    });

    await this.orderStatus.transition(dto.orderId, OrderStatus.DISPUTED, {
      changedById: buyerId,
      reason: `Dispute opened: ${dto.reason}`,
    });

    return dispute;
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { evidence: true, order: { include: { items: true } } },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');

    const isAdmin = user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN');
    const isParty =
      dispute.openedById === user.id || dispute.order.items.some((i) => i.sellerId === user.id);
    if (!isAdmin && !isParty) throw new ForbiddenException('You do not have access to this dispute');

    return dispute;
  }

  findAllOpen() {
    return this.prisma.dispute.findMany({
      where: { status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] } },
      include: { order: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addEvidence(disputeId: string, uploader: AuthenticatedUser, dto: AddEvidenceDto) {
    await this.findOne(disputeId, uploader); // throws if the uploader has no access to this dispute

    return this.prisma.disputeEvidence.create({
      data: { disputeId, uploadedById: uploader.id, url: dto.url, publicId: dto.publicId, type: dto.type, note: dto.note },
    });
  }

  async resolve(disputeId: string, adminId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundException('Dispute not found');

    if ((dto.status === DisputeStatus.REFUNDED || dto.status === DisputeStatus.PARTIALLY_REFUNDED) && !dto.refundAmount) {
      throw new BadRequestException('refundAmount is required for this resolution');
    }

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: dto.status,
        resolutionNote: dto.resolutionNote,
        refundAmount: dto.refundAmount,
        resolvedById: adminId,
        resolvedAt: new Date(),
      },
    });

    // TODO(Phase 5 — Ledger): REFUNDED/PARTIALLY_REFUNDED must post a ledger reversal and,
    // where the PSP supports it, call PaymentProvider.refund() — not implemented yet.
    switch (dto.status) {
      case DisputeStatus.REFUNDED:
      case DisputeStatus.PARTIALLY_REFUNDED:
        return this.orderStatus.transition(dispute.orderId, OrderStatus.REFUNDED, {
          changedById: adminId,
          reason: dto.resolutionNote,
        });
      case DisputeStatus.RETURN_REQUESTED:
        return this.orderStatus.transition(dispute.orderId, OrderStatus.RETURN_REQUESTED, {
          changedById: adminId,
          reason: dto.resolutionNote,
        });
      case DisputeStatus.REJECTED:
      case DisputeStatus.CLOSED:
        return this.orderStatus.transition(dispute.orderId, OrderStatus.COMPLETED, {
          changedById: adminId,
          reason: dto.resolutionNote,
        });
      default:
        return this.prisma.dispute.findUniqueOrThrow({ where: { id: disputeId } });
    }
  }
}
