import { test, expect, expectTypeOf } from 'vitest';
import { placeOrderSchema } from '../orders/schemas';
import type { PaymentAction, PaymentOptionsResponse, PaymentProviderChoice } from './types';
import type { PlaceOrderRequest } from '../orders/types';

test('PLAY_BILLING is a member of the PaymentAction union', () => {
  const action: PaymentAction = {
    type: 'PLAY_BILLING',
    productId: 'ls_price_3000',
    externalReference: 'pay-1',
  };
  expect(action.type).toBe('PLAY_BILLING');
});

// The web is pinned to STRIPE and the app picks between the two; a widened
// PaymentProvider (which also carries PIX, PAYPAL…) must never leak into the
// request body.
test('PlaceOrderRequest.provider is the two-member choice, not PaymentProvider', () => {
  expectTypeOf<PlaceOrderRequest['provider']>().toEqualTypeOf<PaymentProviderChoice>();
});

test('placeOrderSchema accepts both providers and rejects everything else', () => {
  expect(placeOrderSchema.safeParse({ provider: 'STRIPE' }).success).toBe(true);
  expect(placeOrderSchema.safeParse({ provider: 'GOOGLE_PLAY' }).success).toBe(true);
  expect(placeOrderSchema.safeParse({ provider: 'PIX' }).success).toBe(false);
  expect(placeOrderSchema.safeParse({ provider: 'PAYPAL' }).success).toBe(false);
});

test('placeOrderSchema carries an optional external-transaction token', () => {
  const parsed = placeOrderSchema.parse({
    provider: 'STRIPE',
    flow: 'PAYMENT_INTENT',
    playExternalTransactionToken: 'etx-1',
  });
  expect(parsed.playExternalTransactionToken).toBe('etx-1');
  expect(placeOrderSchema.parse({ provider: 'STRIPE' }).playExternalTransactionToken).toBeUndefined();
  expect(
    placeOrderSchema.safeParse({ provider: 'STRIPE', playExternalTransactionToken: 'x'.repeat(513) })
      .success,
  ).toBe(false);
});

// `play: null` is the whole protocol for "no Play here" — an off-ladder total,
// iOS, the flag off. The app renders one option instead of two.
test('PaymentOptionsResponse says stripe with a boolean and play with a nullable SKU', () => {
  const both: PaymentOptionsResponse = { stripe: true, play: { productId: 'ls_price_3000' } };
  const stripeOnly: PaymentOptionsResponse = { stripe: true, play: null };
  expect(both.play?.productId).toBe('ls_price_3000');
  expect(stripeOnly.play).toBeNull();
});
