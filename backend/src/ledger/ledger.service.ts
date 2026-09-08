import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerAccountType, LedgerDirection, LedgerTransactionType } from '../generated/prisma/enums.js';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateUserAccount(userId: string, currencyCode: string, type: LedgerAccountType = LedgerAccountType.USER_WALLET) {
    return this.prisma.ledgerAccount.upsert({
      where: { userId },
      create: { userId, type, currencyCode },
      update: {},
    });
  }

  async getMyTransactions(userId: string) {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { userId } });
    if (!account) return [];
    return this.prisma.ledgerTransaction.findMany({
      where: { ledgerAccountId: account.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Records a single-sided posting against an account. Real double-entry postings (e.g. an
   * order payment crediting the platform escrow account and later debiting it into the
   * seller's wallet on settlement) are orchestrated by the modules that own that business
   * event (Payments, Orders, Withdrawals) — this method is the shared, audited primitive they
   * all go through. Phase 5 wires the actual escrow/settlement/withdrawal flows.
   */
  async post(params: {
    ledgerAccountId: string;
    type: LedgerTransactionType;
    direction: LedgerDirection;
    amount: number;
    currencyCode: string;
    reference: string;
    orderId?: string;
    paymentTransactionId?: string;
    settlementId?: string;
    withdrawalId?: string;
  }) {
    return this.prisma.ledgerTransaction.create({ data: params });
  }
}
