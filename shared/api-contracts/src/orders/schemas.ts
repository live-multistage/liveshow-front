import { z } from 'zod';

export const placeOrderSchema = z.object({
  provider: z.enum(['STRIPE', 'GOOGLE_PLAY']),
  couponCode: z.string().trim().max(50).optional(),
  flow: z.enum(['CHECKOUT_SESSION', 'PAYMENT_INTENT']).optional(),
  playExternalTransactionToken: z.string().max(512).optional(),
});

export type PlaceOrderFormValues = z.infer<typeof placeOrderSchema>;
