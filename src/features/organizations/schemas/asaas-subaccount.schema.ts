import { z } from 'zod';
import { isCpfOrCnpj, normalizeTaxDocument } from '@live-show/api-contracts';

const digits = (v: string) => v.replace(/\D/g, '');

// NOTE on the missing `satisfies z.ZodType<CreateAsaasSubaccountRequest>`:
// this repo's tsconfig has `strict: false` (no `strictNullChecks`), and under
// that setting ANY zod object schema — regardless of field shape, with or
// without `.transform()`/`.refine()` — infers its `_output` as fully partial
// (zod's mapped-type machinery relies on `undefined extends T` checks that
// collapse once strictNullChecks is off). Verified in isolation: the same
// `satisfies` clause fails identically on a trivial two-field object with no
// transforms at all, and passes once `strict: true` is set. Flipping
// strictNullChecks repo-wide is out of scope here, so the compile-time pin
// against contract drift lives in this schema's test file instead, as a
// `Required<z.output<...>>` value assignment — that check is a structural
// "missing/optional property" comparison, which fails correctly even under
// strict: false (verified by dropping a field locally).
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
