import { describe, expect, it } from 'vitest';
import { paymentChoiceOf, visiblePaymentMethods } from './payment-choice';
import type { PaymentMethod } from '../types/checkout.types';

const m = (id: string, provider: 'STRIPE' | 'ASAAS', type: PaymentMethod['type']): PaymentMethod => ({ id, provider, type, displayName: id });
const STRIPE_CARD = m('CREDIT_CARD', 'STRIPE', 'CREDIT_CARD');
const ASAAS_PIX = m('ASAAS_PIX', 'ASAAS', 'PIX');
const ASAAS_CARD = m('ASAAS_CREDIT_CARD', 'ASAAS', 'CREDIT_CARD');
const all = [ASAAS_PIX, ASAAS_CARD, STRIPE_CARD];

describe('paymentChoiceOf', () => {
  it('maps Stripe methods to the Stripe provider with no method', () => {
    expect(paymentChoiceOf(STRIPE_CARD)).toEqual({ provider: 'STRIPE' });
  });

  it('maps Asaas Pix and card to provider + method', () => {
    expect(paymentChoiceOf(ASAAS_PIX)).toEqual({ provider: 'ASAAS', method: 'PIX' });
    expect(paymentChoiceOf(ASAAS_CARD)).toEqual({ provider: 'ASAAS', method: 'CREDIT_CARD' });
  });
});

describe('visiblePaymentMethods', () => {
  const opts = (pix: boolean, card: boolean) => ({ stripe: false, play: null, asaas: { pix, card } });

  it('hides Asaas methods until options load', () => {
    expect(visiblePaymentMethods(all, undefined)).toEqual([STRIPE_CARD]);
  });

  it('shows Asaas methods the backend allows, Asaas first', () => {
    expect(visiblePaymentMethods(all, opts(true, true))).toEqual([ASAAS_PIX, ASAAS_CARD, STRIPE_CARD]);
    expect(visiblePaymentMethods(all, opts(true, false))).toEqual([ASAAS_PIX, STRIPE_CARD]);
  });

  it('hides Asaas methods when not eligible', () => {
    expect(visiblePaymentMethods(all, opts(false, false))).toEqual([STRIPE_CARD]);
  });
});
