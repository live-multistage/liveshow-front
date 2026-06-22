import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(2, 'Mínimo 2 caracteres.').max(60, 'Máximo 60 caracteres.'),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
