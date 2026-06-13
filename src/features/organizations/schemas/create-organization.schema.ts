import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(255),
  slug: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

export type CreateOrganizationValues = z.infer<typeof createOrganizationSchema>;
