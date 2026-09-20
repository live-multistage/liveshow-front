import { z } from 'zod';
import { isCpfOrCnpj, normalizeTaxDocument } from '@live-show/api-contracts';

const digits = (v: string) => v.replace(/\D/g, '');

export const asaasSubaccountSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    cpfCnpj: z
      .string()
      .transform(normalizeTaxDocument)
      .refine((v) => v.length === 11 || v.length === 14)
      .refine(isCpfOrCnpj, 'CPF ou CNPJ inválido.'),
    companyType: z.enum(['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION']).optional(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    mobilePhone: z.string().transform(digits).refine((v) => v.length === 10 || v.length === 11),
    address: z.string().trim().min(2).max(200),
    addressNumber: z.string().trim().min(1).max(20),
    complement: z.string().trim().max(100).optional(),
    province: z.string().trim().min(2).max(100),
    postalCode: z.string().transform(digits).refine((v) => v.length === 8),
    incomeValue: z.coerce.number().positive(),
  })
  .superRefine((v, ctx) => {
    if (v.cpfCnpj.length === 14 && !v.companyType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['companyType'], message: 'required' });
    }
    if (v.cpfCnpj.length === 11 && !v.birthDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['birthDate'], message: 'required' });
    }
  });

export type AsaasSubaccountForm = z.input<typeof asaasSubaccountSchema>;
