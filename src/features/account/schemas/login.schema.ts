import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail.')
    .email('Informe um e-mail válido.')
    .max(255),
  password: z
    .string()
    .min(1, 'Informe sua senha.')
    .min(8, 'A senha deve ter pelo menos 8 caracteres.'),
  rememberMe: z.boolean().default(true),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
