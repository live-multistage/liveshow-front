import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail.')
    .email('Informe um e-mail válido.')
    .max(255),
  // Login only checks presence — length/complexity is a registration rule.
  // Enforcing min(8) here rejects a valid short/legacy password before the
  // server ever sees it, and leaks the policy to anyone probing the form.
  password: z.string().min(1, 'Informe sua senha.'),
  rememberMe: z.boolean().default(true),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
