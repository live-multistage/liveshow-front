import { z } from 'zod';

export const placeOrderSchema = z.object({
  provider: z.enum(['STRIPE', 'GOOGLE_PLAY', 'ASAAS']),
  couponCode: z.string().trim().max(50).optional(),
  flow: z.enum(['CHECKOUT_SESSION', 'PAYMENT_INTENT']).optional(),
  playExternalTransactionToken: z.string().max(512).optional(),
  method: z.enum(['PIX', 'CREDIT_CARD']).optional(),
});

export type PlaceOrderFormValues = z.infer<typeof placeOrderSchema>;
