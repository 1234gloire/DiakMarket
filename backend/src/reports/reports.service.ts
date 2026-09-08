import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReportDto } from './dto/create-report.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  create(reportedById: string, dto: CreateReportDto) {
    return this.prisma.report.create({ data: { reportedById, ...dto } });
  }

  findOpen() {
    return this.prisma.report.findMany({ where: { status: 'OPEN' }, orderBy: { createdAt: 'asc' } });
  }

  async updateStatus(id: string, status: 'REVIEWED' | 'DISMISSED' | 'ACTIONED') {
    return this.prisma.report.update({ where: { id }, data: { status } });
  }
}
