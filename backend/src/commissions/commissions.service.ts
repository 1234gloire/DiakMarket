import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateCommissionRuleDto } from './dto/create-commission-rule.dto.js';

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  createRule(dto: CreateCommissionRuleDto) {
    return this.prisma.commissionRule.create({ data: dto });
  }

  listRules(countryId?: string) {
    return this.prisma.commissionRule.findMany({
      where: { countryId, isActive: true },
      include: { country: true, category: true },
    });
  }

  async deactivateRule(id: string) {
    return this.prisma.commissionRule.update({ where: { id }, data: { isActive: false } });
  }

  listForSeller(sellerId: string) {
    return this.prisma.commission.findMany({ where: { sellerId }, orderBy: { createdAt: 'desc' } });
  }

  /**
   * Resolves the most specific applicable rule (category+sellerType > category > sellerType > country default)
   * and computes the commission amount for an order item total. Called from the settlement flow (Phase 5).
   */
  async computeCommission(params: { countryId: string; categoryId: string; sellerType: 'INDIVIDUAL' | 'PROFESSIONAL'; amount: number }) {
    const rule = await this.prisma.commissionRule.findFirst({
      where: {
        countryId: params.countryId,
        isActive: true,
        OR: [
          { categoryId: params.categoryId, sellerType: params.sellerType },
          { categoryId: params.categoryId, sellerType: null },
          { categoryId: null, sellerType: params.sellerType },
          { categoryId: null, sellerType: null },
        ],
      },
      orderBy: [{ categoryId: 'desc' }, { sellerType: 'desc' }],
    });

    if (!rule) return 0;
    return Math.round((params.amount * rule.percentageBps) / 10000) + rule.fixedFee;
  }
}
