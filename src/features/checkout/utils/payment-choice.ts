import type { PaymentMethod, PaymentOptionsResponse } from '../types/checkout.types';

export type PaymentChoice =
  | { provider: 'STRIPE' }
  | { provider: 'ASAAS'; method: 'PIX' | 'CREDIT_CARD' };

export function paymentChoiceOf(method: PaymentMethod): PaymentChoice {
  if (method.provider !== 'ASAAS') return { provider: 'STRIPE' };
  return { provider: 'ASAAS', method: method.type === 'PIX' ? 'PIX' : 'CREDIT_CARD' };
}

/**
 * The backend decides which Asaas methods this cart may use (every organizer
 * must be able to receive its split); Stripe methods are always listed.
 * Asaas first: Pix is the method most Brazilian buyers expect.
 */
export function visiblePaymentMethods(
  methods: PaymentMethod[],
  options: PaymentOptionsResponse | undefined,
): PaymentMethod[] {
  const asaasAllowed = (m: PaymentMethod) =>
    m.type === 'PIX' ? !!options?.asaas.pix : !!options?.asaas.card;
  const asaas = methods.filter((m) => m.provider === 'ASAAS' && asaasAllowed(m));
  return [...asaas, ...methods.filter((m) => m.provider !== 'ASAAS')];
}
