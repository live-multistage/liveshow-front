import { z } from 'zod';

export const addOrgMemberSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.enum(['ADMIN', 'CONTENT_MANAGER', 'OPERATOR']),
});

export type AddOrgMemberFormValues = z.infer<typeof addOrgMemberSchema>;
