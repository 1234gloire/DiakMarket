import type { PaymentProviderCode } from '../../generated/prisma/enums.js';

export interface InitiatePaymentInput {
  paymentTransactionId: string;
  amount: number; // minor unit
  currencyCode: string;
  payerPhone: string;
  idempotencyKey: string;
}

export interface InitiatePaymentResult {
  providerReference: string;
  /** Set when the flow requires redirecting the buyer (checkout page / USSD prompt confirmation). */
  redirectUrl?: string;
  status: 'PENDING' | 'PROCESSING';
}

export interface WebhookVerificationInput {
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface WebhookVerificationResult {
  valid: boolean;
  externalEventId: string;
  providerReference: string;
  status: 'SUCCEEDED' | 'FAILED';
  failureReason?: string;
}

export interface RefundInput {
  providerReference: string;
  amount: number;
  reason: string;
}

export interface RefundResult {
  providerRefundReference: string;
}

/**
 * PaymentProvider abstraction (cahier des charges §14/§44). Orders and the ledger never talk
 * to a PSP directly — they call through this interface so a real PSP can be swapped in per
 * country without touching order/checkout logic. Concrete PSP implementations (Wave, Orange
 * Money, MTN MoMo, Airtel Money, Moov Money) require real credentials and API docs we do not
 * have yet; only MockPaymentProvider is implemented today. MockPaymentProvider must never run
 * in production — PaymentsService enforces that.
 */
export interface PaymentProvider {
  readonly code: PaymentProviderCode;
  supportsRefund: boolean;

  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  verifyWebhook(input: WebhookVerificationInput): WebhookVerificationResult;
  refund(input: RefundInput): Promise<RefundResult>;
}
