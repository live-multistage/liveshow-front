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

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Informe seu e-mail.')
      .email('Informe um e-mail válido.')
      .max(255, 'O e-mail deve ter no máximo 255 caracteres.'),
    displayName: z
      .string()
      .min(2, 'Seu nome deve ter pelo menos 2 caracteres.')
      .max(100, 'O nome deve ter no máximo 100 caracteres.'),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const socialLoginSchema = z.object({
  provider: z.enum(['GOOGLE', 'APPLE']),
  // The caps mirror the server DTO exactly; a client-side reject saves an
  // unauthenticated round trip, it does not replace the server's validation.
  idToken: z.string().min(1).max(4096),
  nonce: z.string().max(128).optional(),
  fullName: z.string().max(120).optional(),
  authorizationCode: z.string().max(2048).optional(),
  rememberMe: z.boolean().default(true),
});

export type SocialLoginValues = z.infer<typeof socialLoginSchema>;
