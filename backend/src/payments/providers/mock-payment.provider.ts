import { randomUUID, createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PaymentProviderCode } from '../../generated/prisma/enums.js';
import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  WebhookVerificationInput,
  WebhookVerificationResult,
} from './payment-provider.interface.js';

const MOCK_SECRET = 'diakmarket-mock-provider-secret'; // dev/test only — never used in production

interface MockWebhookPayload {
  externalEventId: string;
  providerReference: string;
  status: 'SUCCEEDED' | 'FAILED';
  failureReason?: string;
}

/**
 * A working, self-contained PaymentProvider implementation used in development/staging and
 * automated tests. It never talks to a real Mobile Money network — it exists so the rest of
 * the payment flow (idempotency, webhook verification, order state transitions, ledger
 * postings) can be built and tested end-to-end before a real PSP contract is signed. See
 * PaymentsService — it refuses to select this provider when NODE_ENV=production.
 */
@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly code = PaymentProviderCode.MOCK;
  readonly supportsRefund = true;

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    return {
      providerReference: `mock_${randomUUID()}`,
      status: 'PROCESSING',
    };
  }

  verifyWebhook(input: WebhookVerificationInput): WebhookVerificationResult {
    const signatureHeader = input.headers['x-mock-signature'];
    const expected = createHmac('sha256', MOCK_SECRET).update(input.rawBody).digest('hex');
    const valid = signatureHeader === expected;

    const payload = JSON.parse(input.rawBody) as MockWebhookPayload;
    return {
      valid,
      externalEventId: payload.externalEventId,
      providerReference: payload.providerReference,
      status: payload.status,
      failureReason: payload.failureReason,
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return { providerRefundReference: `mock_refund_${randomUUID()}` };
  }

  /** Test/dev helper: builds a correctly-signed webhook payload for a given outcome. */
  static buildSignedWebhook(providerReference: string, status: 'SUCCEEDED' | 'FAILED', failureReason?: string) {
    const payload: MockWebhookPayload = { externalEventId: randomUUID(), providerReference, status, failureReason };
    const rawBody = JSON.stringify(payload);
    const signature = createHmac('sha256', MOCK_SECRET).update(rawBody).digest('hex');
    return { rawBody, headers: { 'x-mock-signature': signature } };
  }
}
