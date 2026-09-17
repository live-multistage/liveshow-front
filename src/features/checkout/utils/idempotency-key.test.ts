import { describe, it, expect } from 'vitest';
import { cartIdempotencyKey } from './idempotency-key';

const base = { ticketProductIds: ['tp-1', 'tp-2'], provider: 'STRIPE' };

describe('cartIdempotencyKey', () => {
  it('is stable across calls — this is what makes a second click replay instead of re-charge', async () => {
    expect(await cartIdempotencyKey(base)).toBe(await cartIdempotencyKey(base));
  });

  it('ignores the order the cart lines come back in', async () => {
    expect(await cartIdempotencyKey({ ...base, ticketProductIds: ['tp-2', 'tp-1'] })).toBe(
      await cartIdempotencyKey(base),
    );
  });

  it('treats an absent coupon and an empty one as the same cart', async () => {
    expect(await cartIdempotencyKey({ ...base, couponCode: null })).toBe(
      await cartIdempotencyKey(base),
    );
  });

  it('changes when the cart changes, so a different purchase is a different order', async () => {
    const key = await cartIdempotencyKey(base);
    expect(await cartIdempotencyKey({ ...base, ticketProductIds: ['tp-1'] })).not.toBe(key);
    expect(await cartIdempotencyKey({ ...base, couponCode: 'SAVE10' })).not.toBe(key);
    expect(await cartIdempotencyKey({ ...base, provider: 'GOOGLE_PLAY' })).not.toBe(key);
    expect(await cartIdempotencyKey({ ...base, flow: 'PAYMENT_INTENT' })).not.toBe(key);
  });

  it('is a hex digest the API will accept', async () => {
    expect(await cartIdempotencyKey(base)).toMatch(/^[0-9a-f]{64}$/);
  });
});
