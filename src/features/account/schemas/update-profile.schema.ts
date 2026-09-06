import { z } from 'zod';
import { isCpfOrCnpj } from '@live-show/api-contracts';

export const updateProfileSchema = z.object({
  displayName: z.string().min(2, 'Mínimo 2 caracteres.').max(60, 'Máximo 60 caracteres.'),
  phone: z.string().max(20, 'Máximo 20 caracteres.').optional(),
  taxDocument: z
    .string()
    .max(18)
    .refine((v) => v === '' || v === undefined || isCpfOrCnpj(v), 'CPF ou CNPJ inválido.')
    .optional(),
  bio: z.string().max(280, 'Máximo 280 caracteres.').optional(),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
