import { test, expect, expectTypeOf } from 'vitest';
import { placeOrderSchema } from './schemas';
import type { OrderLineView } from './types';
import type { AccessCapability } from '../common/access-capability';

test('placeOrderSchema accepts valid STRIPE provider', () => {
  const result = placeOrderSchema.safeParse({
    provider: 'STRIPE',
  });
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.provider).toBe('STRIPE');
  }
});

test('placeOrderSchema accepts STRIPE with couponCode', () => {
  const result = placeOrderSchema.safeParse({
    provider: 'STRIPE',
    couponCode: 'SUMMER2024',
  });
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.couponCode).toBe('SUMMER2024');
  }
});

test('placeOrderSchema rejects invalid provider', () => {
  const result = placeOrderSchema.safeParse({
    provider: 'PAYPAL',
  });
  expect(result.success).toBe(false);
});

test('placeOrderSchema trims couponCode', () => {
  const result = placeOrderSchema.safeParse({
    provider: 'STRIPE',
    couponCode: '  abc  ',
  });
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.couponCode).toBe('abc');
  }
});

test('placeOrderSchema rejects couponCode longer than 50 chars', () => {
  const result = placeOrderSchema.safeParse({
    provider: 'STRIPE',
    couponCode: 'a'.repeat(51),
  });
  expect(result.success).toBe(false);
});

test('OrderLineView.capabilities is typed as AccessCapability[]', () => {
  expectTypeOf<OrderLineView['capabilities']>().toEqualTypeOf<AccessCapability[]>();
});

test('flow is optional and only accepts the two known values', () => {
  expect(placeOrderSchema.parse({ provider: 'STRIPE' }).flow).toBeUndefined();
  expect(placeOrderSchema.parse({ provider: 'STRIPE', flow: 'PAYMENT_INTENT' }).flow).toBe(
    'PAYMENT_INTENT',
  );
  expect(placeOrderSchema.safeParse({ provider: 'STRIPE', flow: 'IAP' }).success).toBe(false);
});
