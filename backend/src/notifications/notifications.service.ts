import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { NotificationType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  findMine(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }

  /**
   * Persists the in-app notification row. Push delivery via Firebase Cloud Messaging
   * (§32) is wired in Phase 5 through a BullMQ processor consuming these events —
   * this method is the single place other modules call into so that hookup stays
   * centralized.
   */
  async create(userId: string, type: NotificationType, title: string, body: string, data?: Prisma.InputJsonValue) {
    return this.prisma.notification.create({ data: { userId, type, title, body, data } });
  }
}
