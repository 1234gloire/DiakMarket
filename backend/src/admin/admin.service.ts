import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { paginate, type PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import type { Role, UserStatus } from '../generated/prisma/enums.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        include: { profile: true, country: true },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.user.count(),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async updateUserRoles(adminId: string, userId: string, roles: Role[]) {
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { roles } });
    await this.recordAction(adminId, 'user.roles.update', 'User', userId, { roles });
    return updated;
  }

  async updateUserStatus(adminId: string, userId: string, status: UserStatus) {
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { status } });
    await this.recordAction(adminId, 'user.status.update', 'User', userId, { status });
    return updated;
  }

  async listAuditLogs(query: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminAction.findMany({
        include: { admin: { select: { id: true, email: true, profile: true } } },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.adminAction.count(),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  private recordAction(adminId: string, action: string, targetType: string, targetId: string, metadata?: Prisma.InputJsonValue) {
    return this.prisma.adminAction.create({ data: { adminId, action, targetType, targetId, metadata } });
  }
}
