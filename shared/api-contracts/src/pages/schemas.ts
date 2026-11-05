import { z } from 'zod';
import {
  PAGE_CONTEXT_TYPES,
  PAGE_LIMITS as L,
  PAGE_SECTION_REQUIRES_CONTEXT,
  PAGE_RAIL_LIMITS,
  PAGE_RAIL_SOURCES,
  PAGE_SECTION_BACKGROUNDS,
  PAGE_SECTION_SHOW_ON,
  PAGE_SECTION_SPACINGS,
  PAGE_SECTION_TYPES,
  pageSlugError,
  type PageDocument,
  type PageSection,
  type PageSectionPropsByType,
  type PageSectionType,
  type PageTextRun,
} from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANCHOR = /^#[A-Za-z0-9_-]{1,64}$/;
const ICON = /^[a-z-]{1,40}$/;
const REQUIRED = 'Obrigatório.';
const HREF_MESSAGE = 'Use um link https://, /caminho ou #âncora.';
const HTTPS_MESSAGE = `Use um link https:// com até ${L.urlMax} caracteres.`;

// Any whitespace, control char or backslash is rejected anywhere (browsers normalise them into other URLs).
const UNSAFE_CHARS = /[\s\u0000-\u001f\u007f\\]/;
const HTTPS_PREFIX = /^https:\/\/[^/?#]/;
const ABSOLUTE_PATH = /^\/(?![/\\])/;

export function isPageHttpsUrl(value: string): boolean {
  if (value.length === 0 || value.length > L.urlMax) return false;
  if (UNSAFE_CHARS.test(value) || !HTTPS_PREFIX.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.username === '' && url.password === '';
  } catch {
    return false;
  }
}

export function isPageHref(value: string): boolean {
  if (value.length === 0 || value.length > L.urlMax || UNSAFE_CHARS.test(value)) return false;
  if (value.startsWith('/')) return ABSOLUTE_PATH.test(value);
  if (value.startsWith('#')) return ANCHOR.test(value);
  return isPageHttpsUrl(value);
}

const uuid = z.string({ required_error: REQUIRED }).regex(UUID, 'ID inválido.');
const RESERVED_BRACES = '`{{` é reservado.';
const noBraces = (v: string) => !v.includes('{{');
// User-visible text: never accepts `{{` (reserved for future templating). Not used for href/url/id/icon/slug.
const pageText = (max: number, { required = true } = {}) => {
  const base = z.string({ required_error: REQUIRED });
  return (required ? base.min(1, REQUIRED) : base)
    .max(max, `Máximo de ${max} caracteres.`)
    .refine(noBraces, RESERVED_BRACES);
};
const str = (max: number) => pageText(max);
const optStr = (max: number) => pageText(max, { required: false }).optional();
const list = <T extends z.ZodTypeAny>(item: T, min: number, max: number) =>
  z
    .array(item, { required_error: REQUIRED })
    .min(min, `Mínimo de ${min} itens.`)
    .max(max, `Máximo de ${max} itens.`);

export const pageHttpsUrlSchema = z.string({ required_error: REQUIRED }).refine(isPageHttpsUrl, HTTPS_MESSAGE);
export const pageHrefSchema = z.string({ required_error: REQUIRED }).refine(isPageHref, HREF_MESSAGE);

export const pageTextRunSchema = z
  .object({
    text: pageText(Number.MAX_SAFE_INTEGER),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    href: pageHrefSchema.optional(),
  })
  .strict();

const paragraphsSchema = z
  .array(z.array(pageTextRunSchema).min(1, REQUIRED), { required_error: REQUIRED })
  .min(1, REQUIRED)
  .refine(
    (paragraphs: PageTextRun[][]) =>
      paragraphs.reduce((sum, runs) => sum + runs.reduce((n, run) => n + run.text.length, 0), 0) <= L.textMax,
    `Máximo de ${L.textMax} caracteres.`,
  );

export const pageCtaSchema = z.object({ label: str(L.ctaLabelMax), href: pageHrefSchema }).strict();
export const pageImageSchema = z.object({ url: pageHttpsUrlSchema, alt: str(L.altMax) }).strict();

const object = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

// `id` is always validated as text when present; only non-live kinds require it (live ignores it).
const railSourceSchema = object({
  kind: z.enum(PAGE_RAIL_SOURCES),
  id: pageText(64).optional(),
}).superRefine((source, ctx) => {
  if (source.kind !== 'live' && source.id === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['id'], message: REQUIRED });
  }
});

export const sectionPropsSchemas = {
  hero: object({
    eyebrow: optStr(L.eyebrowMax),
    title: str(L.headingMax),
    subtitle: optStr(200),
    primaryCta: pageCtaSchema.optional(),
    secondaryCta: pageCtaSchema.optional(),
    image: pageImageSchema.optional(),
  }),
  audience: object({
    text: str(L.headingMax),
    counters: list(object({ value: str(L.statValueMax), label: str(L.counterLabelMax) }), 0, 4),
  }),
  text: object({ title: optStr(L.headingMax), paragraphs: paragraphsSchema }),
  features: object({
    title: str(L.headingMax),
    items: list(
      object({
        icon: z.string().regex(ICON, 'Use só letras minúsculas e hífen.').optional(),
        title: str(L.itemTitleMax),
        text: str(L.itemTextMax),
      }),
      2,
      6,
    ),
  }),
  how: object({
    eyebrow: optStr(L.eyebrowMax),
    title: str(L.headingMax),
    steps: list(object({ title: str(L.itemTitleMax), text: str(L.itemTextMax) }), 3, 5),
  }),
  media: object({
    kind: z.enum(['image', 'video']),
    url: pageHttpsUrlSchema,
    alt: str(L.altMax),
    caption: optStr(L.captionMax),
  }),
  stats: object({
    title: optStr(L.headingMax),
    items: list(object({ value: str(L.statValueMax), label: str(L.statLabelMax) }), 2, 4),
  }),
  rail: object({
    title: str(L.railTitleMax),
    source: railSourceSchema,
    limit: z.union([z.literal(PAGE_RAIL_LIMITS[0]), z.literal(PAGE_RAIL_LIMITS[1]), z.literal(PAGE_RAIL_LIMITS[2])]),
  }),
  featured: object({ eventId: uuid, ctaLabel: optStr(L.ctaLabelMax) }),
  pricing: object({
    title: str(L.headingMax),
    plans: list(
      object({
        name: str(L.planNameMax),
        price: str(L.planPriceMax),
        description: optStr(200),
        cta: pageCtaSchema.optional(),
      }),
      2,
      3,
    ),
  }),
  faq: object({
    title: str(L.headingMax),
    items: list(object({ question: str(L.faqQuestionMax), answer: str(L.faqAnswerMax) }), 3, 12),
  }),
  final: object({ title: str(L.headingMax), subtitle: optStr(200), cta: pageCtaSchema }),
};

export const pageSectionAppearanceSchema = object({
  background: z.enum(PAGE_SECTION_BACKGROUNDS),
  spacing: z.enum(PAGE_SECTION_SPACINGS),
  showOn: z.enum(PAGE_SECTION_SHOW_ON),
});

const sectionOf = <K extends PageSectionType>(type: K) =>
  object({
    id: uuid,
    type: z.literal(type),
    hidden: z.boolean(),
    appearance: pageSectionAppearanceSchema,
    props: sectionPropsSchemas[type],
  });

export const pageSectionSchema = z.discriminatedUnion('type', [
  sectionOf('hero'),
  sectionOf('audience'),
  sectionOf('text'),
  sectionOf('features'),
  sectionOf('how'),
  sectionOf('media'),
  sectionOf('stats'),
  sectionOf('rail'),
  sectionOf('featured'),
  sectionOf('pricing'),
  sectionOf('faq'),
  sectionOf('final'),
]);

export const pageContextSchema = z.object({ type: z.enum(PAGE_CONTEXT_TYPES) }).strict();

const contextIssues = (
  doc: { context: { type: (typeof PAGE_CONTEXT_TYPES)[number] }; sections: { type: PageSectionType }[] },
  ctx: z.RefinementCtx,
) =>
  doc.sections.forEach((section, i) => {
    const required = PAGE_SECTION_REQUIRES_CONTEXT[section.type];
    if (required.length === 0 || required.includes(doc.context.type)) return;
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sections', i], message: 'Esta seção não está disponível neste tipo de página.' });
  });

// Draft props are free-form, so scan every string except link/id-like keys.
const NON_TEXT_KEYS = new Set(['href', 'url', 'icon', 'eventId', 'kind', 'type']);
const bracePaths = (value: unknown, path: (string | number)[] = []): (string | number)[][] => {
  if (typeof value === 'string') return noBraces(value) ? [] : [path];
  if (Array.isArray(value)) return value.flatMap((v, i) => bracePaths(v, [...path, i]));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => (NON_TEXT_KEYS.has(k) ? [] : bracePaths(v, [...path, k])));
  }
  return [];
};

const uniqueIds = (doc: { sections: { id: string }[] }) =>
  new Set(doc.sections.map((s) => s.id)).size === doc.sections.length;
const UNIQUE_IDS_MESSAGE = 'IDs de seção duplicados.';
const TOO_MANY = `Máximo de ${L.maxSections} seções.`;

/** Complete document, required to publish. */
export const pageDocumentSchema = object({
  schemaVersion: z.literal(1),
  context: pageContextSchema,
  sections: z.array(pageSectionSchema).max(L.maxSections, TOO_MANY),
})
  .refine(uniqueIds, { message: UNIQUE_IDS_MESSAGE, path: ['sections'] })
  .superRefine(contextIssues);

/** Structure only: props may be incomplete so autosave never loses work. */
export const pageDraftSchema = object({
  schemaVersion: z.literal(1),
  context: pageContextSchema,
  sections: z
    .array(
      object({
        id: uuid,
        type: z.enum(PAGE_SECTION_TYPES),
        hidden: z.boolean(),
        appearance: pageSectionAppearanceSchema,
        props: z.record(z.unknown()),
      }),
    )
    .max(L.maxSections, TOO_MANY),
})
  .refine(uniqueIds, { message: UNIQUE_IDS_MESSAGE, path: ['sections'] })
  .refine((doc) => new TextEncoder().encode(JSON.stringify(doc)).length <= L.draftMaxBytes, { message: 'Página grande demais.' })
  .superRefine(contextIssues)
  .superRefine((doc, ctx) =>
    doc.sections.forEach((section, i) =>
      bracePaths(section.props).forEach((path) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['sections', i, 'props', ...path], message: RESERVED_BRACES }),
      ),
    ),
  );

export function upgradePageDocument(raw: unknown): unknown {
  const doc = raw as { schemaVersion?: unknown; context?: unknown } | null;
  if (doc?.schemaVersion === 1) return doc.context === undefined ? { ...doc, context: { type: 'none' } } : raw;
  throw new Error('Unsupported page schemaVersion');
}

const title = z.string({ required_error: REQUIRED }).trim().min(1, REQUIRED).max(L.titleMax, `Máximo de ${L.titleMax} caracteres.`).refine(noBraces, RESERVED_BRACES);
const slug = z.string({ required_error: REQUIRED }).superRefine((value, ctx) => {
  const error = pageSlugError(value);
  if (error === 'format') ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use só letras minúsculas, números e hífen.' });
  if (error === 'reserved') ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Esse endereço é reservado pela plataforma.' });
});
const baseRevision = z.number().int().min(0);

export const createPageSchema = object({ title, slug, duplicateFromPageId: uuid.optional() });
export const saveDraftSchema = object({ document: pageDraftSchema, baseRevision });
export const publishPageSchema = object({
  changeSummary: z.string({ required_error: REQUIRED }).trim().min(1, REQUIRED).max(L.changeSummaryMax, `Máximo de ${L.changeSummaryMax} caracteres.`).refine(noBraces, RESERVED_BRACES),
  baseRevision,
});
export const updatePageSettingsSchema = object({
  title: title.optional(),
  slug: slug.optional(),
  seo: object({
    title: optStr(L.seoTitleMax),
    description: optStr(L.seoDescriptionMax),
    imageUrl: pageHttpsUrlSchema.optional(),
    noindex: z.boolean(),
  }).optional(),
}).refine((v) => Object.values(v).some((field) => field !== undefined), { message: 'Informe ao menos um campo.' });

export type CreatePageRequest = z.infer<typeof createPageSchema>;
export type SaveDraftRequest = z.infer<typeof saveDraftSchema>;
export type PublishPageRequest = z.infer<typeof publishPageSchema>;
export type UpdatePageSettingsRequest = z.infer<typeof updatePageSettingsSchema>;

export function pageSectionIssues(section: PageSection): { path: string; message: string }[] {
  const result = sectionPropsSchemas[section.type].safeParse(section.props);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

const EMPTY_PROPS: { [K in PageSectionType]: () => PageSectionPropsByType[K] } = {
  hero: () => ({ title: '' }),
  audience: () => ({ text: '', counters: [] }),
  text: () => ({ paragraphs: [[{ text: '' }]] }),
  features: () => ({ title: '', items: Array.from({ length: 2 }, () => ({ title: '', text: '' })) }),
  how: () => ({ title: '', steps: Array.from({ length: 3 }, () => ({ title: '', text: '' })) }),
  media: () => ({ kind: 'image', url: '', alt: '' }),
  stats: () => ({ items: Array.from({ length: 2 }, () => ({ value: '', label: '' })) }),
  rail: () => ({ title: '', source: { kind: 'live' }, limit: 8 }),
  featured: () => ({ eventId: '' }),
  pricing: () => ({ title: '', plans: Array.from({ length: 2 }, () => ({ name: '', price: '' })) }),
  faq: () => ({ title: '', items: Array.from({ length: 3 }, () => ({ question: '', answer: '' })) }),
  final: () => ({ title: '', cta: { label: '', href: '' } }),
};

export function createEmptySection<K extends PageSectionType>(type: K, id: string): PageSection<K> {
  return {
    id,
    type,
    hidden: false,
    appearance: { background: 'default', spacing: 'normal', showOn: 'all' },
    props: EMPTY_PROPS[type](),
  } as PageSection<K>;
}

export function createEmptyDocument(): PageDocument {
  return { schemaVersion: 1, context: { type: 'none' }, sections: [] };
}
