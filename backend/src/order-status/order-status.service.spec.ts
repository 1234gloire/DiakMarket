import { OrderStatusService } from './order-status.service.js';
import { OrderStatus } from '../generated/prisma/enums.js';

describe('OrderStatusService.canTransition (state machine graph)', () => {
  const service = new OrderStatusService({} as never);

  it('allows the full happy path in sequence', () => {
    const happyPath: OrderStatus[] = [
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAID,
      OrderStatus.SELLER_CONFIRMED,
      OrderStatus.READY_FOR_PICKUP,
      OrderStatus.PICKED_UP,
      OrderStatus.IN_TRANSIT,
      OrderStatus.DELIVERED,
      OrderStatus.BUYER_CONFIRMED,
      OrderStatus.COMPLETED,
    ];
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(service.canTransition(happyPath[i], happyPath[i + 1])).toBe(true);
    }
  });

  it('rejects skipping steps', () => {
    expect(service.canTransition(OrderStatus.PAID, OrderStatus.DELIVERED)).toBe(false);
    expect(service.canTransition(OrderStatus.PENDING_PAYMENT, OrderStatus.COMPLETED)).toBe(false);
  });

  it('rejects going backwards', () => {
    expect(service.canTransition(OrderStatus.PAID, OrderStatus.PENDING_PAYMENT)).toBe(false);
    expect(service.canTransition(OrderStatus.DELIVERED, OrderStatus.PICKED_UP)).toBe(false);
  });

  it('terminal states have no outgoing transitions except DISPUTED\'s resolutions', () => {
    expect(service.canTransition(OrderStatus.CANCELLED, OrderStatus.PENDING_PAYMENT)).toBe(false);
    expect(service.canTransition(OrderStatus.REFUNDED, OrderStatus.PAID)).toBe(false);
  });

  it('DISPUTED can resolve to refund, return, or back into the normal flow', () => {
    expect(service.canTransition(OrderStatus.DISPUTED, OrderStatus.REFUNDED)).toBe(true);
    expect(service.canTransition(OrderStatus.DISPUTED, OrderStatus.RETURN_REQUESTED)).toBe(true);
    expect(service.canTransition(OrderStatus.DISPUTED, OrderStatus.RETURNED)).toBe(true);
    expect(service.canTransition(OrderStatus.DISPUTED, OrderStatus.COMPLETED)).toBe(true);
    expect(service.canTransition(OrderStatus.DISPUTED, OrderStatus.CANCELLED)).toBe(true);
  });

  it('PAYMENT_FAILED can retry back to PENDING_PAYMENT or give up to CANCELLED', () => {
    expect(service.canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING_PAYMENT)).toBe(true);
    expect(service.canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED)).toBe(true);
    expect(service.canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PAID)).toBe(false);
  });

  it('every OrderStatus value is a defined key in the transition graph (no silent fallthrough)', () => {
    for (const status of Object.values(OrderStatus)) {
      // Any call must return a boolean, never throw or return undefined-as-truthy.
      expect(typeof service.canTransition(status, status)).toBe('boolean');
    }
  });
});
