import { randomUUID } from 'node:crypto';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrderStatusService } from '../order-status/order-status.service.js';
import { PaymentProviderCode, OrderStatus } from '../generated/prisma/enums.js';
import { MockPaymentProvider } from './providers/mock-payment.provider.js';
import type { PaymentProvider, WebhookVerificationInput } from './providers/payment-provider.interface.js';
import type { InitiatePaymentDto } from './dto/initiate-payment.dto.js';

@Injectable()
export class PaymentsService {
  private readonly providers = new Map<PaymentProviderCode, PaymentProvider>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly orderStatus: OrderStatusService,
    mockProvider: MockPaymentProvider,
  ) {
    this.providers.set(PaymentProviderCode.MOCK, mockProvider);
    // Real PSP adapters (Wave, Orange Money, MTN MoMo, Airtel Money, Moov Money) register
    // here once their credentials and API contracts are available — see PaymentProvider.
  }

  async initiate(buyerId: string, dto: InitiatePaymentDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId) throw new ForbiddenException('This is not your order');
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('This order is not awaiting payment');
    }

    const buyer = await this.prisma.user.findUniqueOrThrow({ where: { id: buyerId } });
    const provider = await this.resolveProvider(buyer.countryId);

    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: provider.code,
        amount: order.grandTotal,
        currencyCode: order.currencyCode,
        idempotencyKey: randomUUID(),
      },
    });

    const result = await provider.initiate({
      paymentTransactionId: transaction.id,
      amount: order.grandTotal,
      currencyCode: order.currencyCode,
      payerPhone: dto.payerPhone,
      idempotencyKey: transaction.idempotencyKey,
    });

    return this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { providerReference: result.providerReference, status: 'PROCESSING' },
    });
  }

  async handleWebhook(providerCode: PaymentProviderCode, input: WebhookVerificationInput) {
    const provider = this.providers.get(providerCode);
    if (!provider) throw new NotFoundException(`Unknown payment provider: ${providerCode}`);

    const result = provider.verifyWebhook(input);

    // Idempotent by construction: a webhook we've already recorded for this provider+event is a no-op.
    const alreadyProcessed = await this.prisma.paymentWebhook.findUnique({
      where: { provider_externalEventId: { provider: providerCode, externalEventId: result.externalEventId } },
    });
    if (alreadyProcessed) return { received: true, alreadyProcessed: true };

    if (!result.valid) {
      await this.prisma.paymentWebhook.create({
        data: {
          provider: providerCode,
          externalEventId: result.externalEventId ?? randomUUID(),
          signatureValid: false,
          rawPayload: this.safeParse(input.rawBody),
        },
      });
      throw new ForbiddenException('Invalid webhook signature');
    }

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: { provider: providerCode, providerReference: result.providerReference },
    });

    await this.prisma.paymentWebhook.create({
      data: {
        paymentTransactionId: transaction?.id,
        provider: providerCode,
        externalEventId: result.externalEventId,
        signatureValid: true,
        rawPayload: this.safeParse(input.rawBody),
        processedAt: new Date(),
      },
    });

    if (!transaction) throw new NotFoundException('Payment transaction not found for this webhook');

    if (result.status === 'SUCCEEDED') {
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: 'SUCCEEDED', completedAt: new Date() },
      });
      // TODO(Phase 5 — Ledger/Commissions/Settlements): post PLATFORM_ESCROW credit + buyer
      // wallet debit here once the ledger posting rules are designed.
      await this.orderStatus.transition(transaction.orderId, OrderStatus.PAID, {
        reason: `Payment ${transaction.id} confirmed by ${providerCode} webhook`,
      });
    } else {
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED', failureReason: result.failureReason, completedAt: new Date() },
      });
      await this.orderStatus.transition(transaction.orderId, OrderStatus.PAYMENT_FAILED, {
        reason: result.failureReason ?? `Payment ${transaction.id} failed at ${providerCode}`,
      });
    }

    return { received: true, alreadyProcessed: false };
  }

  /**
   * Dev/staging-only helper: fires a correctly-signed mock webhook for a PENDING/PROCESSING
   * transaction so the full checkout → payment → PAID flow can be exercised (by the mobile app
   * or automated tests) without a real Mobile Money network. PaymentsController refuses to
   * expose this when NODE_ENV=production.
   */
  async simulate(transactionId: string, outcome: 'SUCCEEDED' | 'FAILED') {
    const transaction = await this.prisma.paymentTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException('Payment transaction not found');
    if (transaction.provider !== PaymentProviderCode.MOCK) {
      throw new BadRequestException('Only MOCK payment transactions can be simulated');
    }
    if (!transaction.providerReference) throw new BadRequestException('Transaction has no provider reference yet');

    const webhook = MockPaymentProvider.buildSignedWebhook(
      transaction.providerReference,
      outcome,
      outcome === 'FAILED' ? 'Simulated failure' : undefined,
    );
    return this.handleWebhook(PaymentProviderCode.MOCK, webhook);
  }

  private async resolveProvider(countryId: string | null): Promise<PaymentProvider> {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    if (countryId) {
      const activeConfig = await this.prisma.paymentProviderConfig.findFirst({
        where: { countryId, isActive: true },
      });
      if (activeConfig) {
        const provider = this.providers.get(activeConfig.provider);
        if (provider) return provider;
      }
    }

    if (isProduction) {
      throw new BadRequestException('No payment provider is configured for your country yet');
    }

    return this.providers.get(PaymentProviderCode.MOCK)!;
  }

  private safeParse(raw: string): object {
    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  }
}
