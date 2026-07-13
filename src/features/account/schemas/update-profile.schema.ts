import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(2, 'Mínimo 2 caracteres.').max(60, 'Máximo 60 caracteres.'),
  phone: z.string().max(20, 'Máximo 20 caracteres.').optional(),
  cpf: z.string().max(14, 'Máximo 14 caracteres.').optional(),
  bio: z.string().max(280, 'Máximo 280 caracteres.').optional(),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
