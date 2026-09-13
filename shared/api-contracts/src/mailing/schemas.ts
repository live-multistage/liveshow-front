import { z } from 'zod';
import {
  MAILING_APPLICATION_KINDS,
  MAILING_APPLICATION_STATUSES,
  MAILING_AUDIENCE_SPECS,
  MAILING_AUDIENCE_TYPES,
  MAILING_EVENT_CATEGORIES,
  MAILING_LIMITS as L,
  type MailingAudienceParamSpec,
  type MailingTextBlock,
  type MailingTextRun,
} from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAILING_ASSET_KEY =
  /^mailing\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp|gif)$/i;

export function isHttpsUrl(value: string): boolean {
  if (value.length === 0 || value.length > L.urlMax) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export function mailingTextLength(paragraphs: MailingTextRun[][]): number {
  return paragraphs.reduce((sum, runs) => sum + runs.reduce((n, run) => n + run.text.length, 0), 0);
}

const uuid = z.string().regex(UUID, 'ID inválido.');
const country = z.string().regex(/^[A-Z]{2}$/, 'Use o código de 2 letras (ex.: BR).');
const label = z.string().min(1, 'Obrigatório.').max(L.labelMax, `Máximo de ${L.labelMax} caracteres.`);

export const httpsUrlSchema = z
  .string()
  .refine(isHttpsUrl, `Use um link https:// com até ${L.urlMax} caracteres.`);

export const mailingTextRunSchema = z
  .object({
    text: z.string().min(1),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    href: httpsUrlSchema.optional(),
  })
  .strict();

export const mailingBlockSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('heading'), text: z.string().min(1, 'Obrigatório.').max(L.headingMax), size: z.enum(['lg', 'md']) }).strict(),
    z.object({ type: z.literal('text'), paragraphs: z.array(z.array(mailingTextRunSchema).min(1)).min(1, 'Obrigatório.') }).strict(),
    z.object({ type: z.literal('image'), assetKey: z.string().regex(MAILING_ASSET_KEY, 'Envie uma imagem.'), alt: z.string().max(L.altMax), href: httpsUrlSchema.optional() }).strict(),
    z.object({ type: z.literal('button'), label, href: httpsUrlSchema }).strict(),
    z.object({ type: z.literal('eventCard'), eventId: uuid, badge: label.optional(), ctaLabel: label.optional() }).strict(),
    z.object({ type: z.literal('eventList'), eventIds: z.array(uuid).min(L.eventListMin).max(L.eventListMax) }).strict(),
    z.object({ type: z.literal('divider') }).strict(),
  ])
  .superRefine((block, ctx) => {
    if (block.type === 'text') {
      const textBlock = block as MailingTextBlock;
      if (mailingTextLength(textBlock.paragraphs) > L.textBlockMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paragraphs'],
          message: `Máximo de ${L.textBlockMax} caracteres por bloco de texto.`,
        });
      }
    }
  });

const draftShape = z
  .object({
    name: z.string().min(1, 'Obrigatório.').max(L.nameMax),
    category: z.enum(['MARKETING', 'ANNOUNCEMENT']),
    subject: z.string().min(1, 'Obrigatório.').max(L.subjectMax, `Máximo de ${L.subjectMax} caracteres.`),
    preheader: z.string().max(L.preheaderMax, `Máximo de ${L.preheaderMax} caracteres.`),
    language: z.enum(['pt', 'en', 'es']),
    blocks: z.array(mailingBlockSchema).max(L.maxBlocks, `Máximo de ${L.maxBlocks} blocos.`),
  })
  .strict();

export const mailingTemplateDraftSchema = draftShape;
export const mailingPreviewRequestSchema = draftShape.omit({ name: true });

function audienceParamSchema(spec: MailingAudienceParamSpec): z.ZodTypeAny {
  let base: z.ZodTypeAny;
  switch (spec.kind) {
    case 'eventId':
    case 'channelId':
    case 'organizationId':
    case 'artistId':
      base = uuid;
      break;
    case 'couponCode':
      base = z.string().min(1, 'Obrigatório.').max(64, 'Máximo de 64 caracteres.');
      break;
    case 'eventCategory':
      base = z.enum(MAILING_EVENT_CATEGORIES as [string, ...string[]]);
      break;
    case 'applicationKind':
      base = z.enum(MAILING_APPLICATION_KINDS);
      break;
    case 'applicationStatus':
      base = z.enum(MAILING_APPLICATION_STATUSES);
      break;
    case 'int':
      base = z.number().int().min(spec.min ?? Number.MIN_SAFE_INTEGER).max(spec.max ?? Number.MAX_SAFE_INTEGER);
      break;
  }
  return spec.optional ? base.optional() : base;
}

const mailingAudienceVariants = MAILING_AUDIENCE_TYPES.map((type) => {
  const shape: Record<string, z.ZodTypeAny> = { type: z.literal(type), country: country.optional() };
  for (const [param, spec] of Object.entries(MAILING_AUDIENCE_SPECS[type])) {
    shape[param] = audienceParamSchema(spec);
  }
  return z.object(shape).strict();
}) as unknown as [z.AnyZodObject, ...z.AnyZodObject[]];

export const mailingAudienceSchema = z.discriminatedUnion('type', mailingAudienceVariants);

export const createMailingCampaignSchema = z
  .object({
    name: z.string().min(1, 'Obrigatório.').max(L.nameMax),
    templateId: uuid,
    audience: mailingAudienceSchema,
  })
  .strict();
