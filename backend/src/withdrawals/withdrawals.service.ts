import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateWithdrawalDto } from './dto/create-withdrawal.dto.js';

@Injectable()
export class WithdrawalsService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string): Promise<{ currencyCode: string | null; amount: number }> {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { userId } });
    if (!account) return { currencyCode: null, amount: 0 };

    const [credits, debits] = await Promise.all([
      this.prisma.ledgerTransaction.aggregate({
        where: { ledgerAccountId: account.id, direction: 'CREDIT' },
        _sum: { amount: true },
      }),
      this.prisma.ledgerTransaction.aggregate({
        where: { ledgerAccountId: account.id, direction: 'DEBIT' },
        _sum: { amount: true },
      }),
    ]);

    return { currencyCode: account.currencyCode, amount: (credits._sum.amount ?? 0) - (debits._sum.amount ?? 0) };
  }

  async request(userId: string, dto: CreateWithdrawalDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.countryId) throw new BadRequestException('Set your country before requesting a withdrawal');

    const rule = await this.prisma.withdrawalRule.findFirst({ where: { countryId: user.countryId, isActive: true } });
    if (rule) {
      if (dto.amount < rule.minAmount || dto.amount > rule.maxAmount) {
        throw new BadRequestException(`Amount must be between ${rule.minAmount} and ${rule.maxAmount}`);
      }
    }

    const balance = await this.getBalance(userId);
    if (dto.amount > balance.amount) throw new BadRequestException('Insufficient balance');

    const feeAmount = rule ? Math.round((dto.amount * rule.feeBps) / 10000) + rule.fixedFee : 0;

    return this.prisma.withdrawal.create({
      data: {
        userId,
        amount: dto.amount,
        feeAmount,
        currencyCode: balance.currencyCode ?? 'XOF',
        provider: dto.provider,
        destination: dto.destination,
      },
    });
  }

  findMine(userId: string) {
    return this.prisma.withdrawal.findMany({ where: { userId }, orderBy: { requestedAt: 'desc' } });
  }

  listPending() {
    return this.prisma.withdrawal.findMany({ where: { status: 'PENDING' }, orderBy: { requestedAt: 'asc' } });
  }

  async reject(id: string, reason: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    return this.prisma.withdrawal.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason, processedAt: new Date() },
    });
  }
}
