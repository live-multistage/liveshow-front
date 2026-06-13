import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.enum(['OWNER', 'ADMIN', 'EVENT_MANAGER', 'VIEWER'], {
    required_error: 'Selecione um cargo',
  }),
});

export type InviteMemberValues = z.infer<typeof inviteMemberSchema>;
