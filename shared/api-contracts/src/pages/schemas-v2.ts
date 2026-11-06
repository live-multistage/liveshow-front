import { z } from 'zod';
import {
  ALIGN_KEYS, ANCHOR_RE, ASPECT_KEYS, BORDER_KEYS, BREAKPOINTS, BUTTON_SIZES, BUTTON_VARIANTS, COLOR_KEYS, COLS_KEYS,
  ELEMENT_SLOT_RULES, ELEMENT_TYPES, GRADIENT_KEYS, HEADING_TAGS, LIVE_NOW_LIMITS, MAXW_KEYS, MINH_KEYS, PAGE_V2_LIMITS as L,
  RADIUS_KEYS, RATIO_KEYS, SHADOW_KEYS, SPACE_KEYS, STYLE_KEYS_BY_TYPE, TYPO_KEYS, VALIGN_KEYS, VIDEO_ALLOWED_HOSTS, WIDTH_KEYS,
  type ElementType, type PageDocumentV2, type StyleKey,
} from './document-v2';
import {
  isPageHttpsUrl, pageContextSchema, pageCtaSchema, pageHrefSchema, pageHttpsUrlSchema, sectionPropsSchemas, isPageHref,
  pageDocumentSchema, pageDraftSchema,
} from './schemas';
import { PAGE_LIMITS as L1, PAGE_RAIL_SOURCES } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUIRED = 'Obrigatório.';
const RESERVED_BRACES = '`{{` é reservado.';
const noBraces = (v: string) => !v.includes('{{');
const uuid = z.string({ required_error: REQUIRED }).regex(UUID, 'ID inválido.');
const pageText = (max: number) =>
  z.string({ required_error: REQUIRED }).min(1, REQUIRED).max(max, `Máximo de ${max} caracteres.`).refine(noBraces, RESERVED_BRACES);
const optText = (max: number) => pageText(max).optional();
const list = <T extends z.ZodTypeAny>(item: T, min: number, max: number) =>
  z.array(item, { required_error: REQUIRED }).min(min, `Mínimo de ${min} itens.`).max(max, `Máximo de ${max} itens.`);
const object = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

// ---- video ----
const MEDIA_ID = /^[\w-]{1,64}$/;
const PLATFORM_PATH = /^[\w-]+(?:[./][\w-]+)*$/;

/** Provider and id of an allowed video URL; the renderer builds the embed URL from the id alone. Null when not embeddable. */
export function pageVideoEmbed(value: string): { provider: 'youtube' | 'vimeo' | 'platform'; id: string } | null {
  if (!isPageHttpsUrl(value)) return null;
  const url = new URL(value);
  if (url.port !== '' || !(VIDEO_ALLOWED_HOSTS as readonly string[]).includes(url.hostname)) return null;
  const host = url.hostname.replace(/^www\./, '');
  const segments = url.pathname.split('/').filter(Boolean);
  const media = (provider: 'youtube' | 'vimeo', id: string | undefined) =>
    id !== undefined && MEDIA_ID.test(id) && (provider === 'youtube' || /^\d+$/.test(id)) ? { provider, id } : null;

  if (host === 'youtu.be') return media('youtube', segments[0]);
  if (host === 'youtube.com') return media('youtube', segments[0] === 'embed' ? segments[1] : segments[0] === 'watch' ? (url.searchParams.get('v') ?? undefined) : undefined);
  if (host === 'youtube-nocookie.com') return media('youtube', segments[0] === 'embed' ? segments[1] : undefined);
  if (host === 'vimeo.com') return media('vimeo', segments[0]);
  if (host === 'player.vimeo.com') return media('vimeo', segments[0] === 'video' ? segments[1] : undefined);
  const path = segments.join('/');
  return segments.length > 0 && PLATFORM_PATH.test(path) ? { provider: 'platform', id: path } : null;
}

export const isPageVideoUrl = (value: string): boolean => pageVideoEmbed(value) !== null;
const VIDEO_MESSAGE = 'Use um vídeo do YouTube, do Vimeo ou da biblioteca da plataforma.';
const videoUrlSchema = z.string({ required_error: REQUIRED }).refine(isPageVideoUrl, VIDEO_MESSAGE);

// ---- inline markup of `text` ----
export interface PageInlineRun {
  text: string;
  bold?: true;
  italic?: true;
  href?: string;
}

// Only `[label](href)`; href has no `)` and no whitespace (so no title). Reference links `[a][r]` never match.
const INLINE_LINK = /\[([^\]]*)\]\(([^)\s]*)\)/g;
const INLINE_EMPHASIS = /\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

const emphasisRuns = (text: string, href?: string): PageInlineRun[] => {
  const runs: PageInlineRun[] = [];
  const push = (chunk: string, marks: Partial<PageInlineRun> = {}) => {
    if (chunk) runs.push({ text: chunk, ...marks, ...(href !== undefined ? { href } : {}) });
  };
  let last = 0;
  for (const m of text.matchAll(INLINE_EMPHASIS)) {
    push(text.slice(last, m.index));
    if (m[1] !== undefined) push(m[1], { bold: true, italic: true });
    else if (m[2] !== undefined) push(m[2], { bold: true });
    else push(m[3] ?? '', { italic: true });
    last = m.index + m[0].length;
  }
  push(text.slice(last));
  return runs;
};

// `\` escapes `\ * [ ] ( )`: escaped characters are swapped for private-use placeholders (U+E000..) while parsing, then restored.
// A literal U+E000..U+E005 in the input would be restored as an escapable character; harmless, and never produced by the editor.
const ESCAPABLE = '\\*[]()';
const ESCAPE_RE = /\\([\\*[\]()])/g;
const hideEscapes = (text: string) => text.replace(ESCAPE_RE, (_, c: string) => String.fromCharCode(0xe000 + ESCAPABLE.indexOf(c)));
const showEscapes = (text: string) => text.replace(/[\ue000-\ue005]/g, (c) => ESCAPABLE[c.charCodeAt(0) - 0xe000]!);

/**
 * Single grammar of `text` elements: `**bold**`, `*italic*`, `***both***` and `[label](href)` (emphasis allowed in the label).
 * A backslash escapes `\ * [ ] ( )` (the escaped character becomes literal). No nesting beyond that, no reference links,
 * no titles, no HTML: everything else is literal text. Renderers and the back mirror use this parser; never interpret
 * the markup anywhere else.
 */
export function parsePageInlineText(source: string): PageInlineRun[] {
  const text = hideEscapes(source);
  const runs: PageInlineRun[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_LINK)) {
    runs.push(...emphasisRuns(text.slice(last, m.index)));
    const label = m[1] ?? '';
    // An empty label still carries the href so the validator sees (and refuses) a bad link.
    runs.push(...(label ? emphasisRuns(label, m[2]) : [{ text: '', href: m[2] ?? '' }]));
    last = m.index + m[0].length;
  }
  runs.push(...emphasisRuns(text.slice(last)));
  return runs.map((r) => ({ ...r, text: showEscapes(r.text), ...(r.href !== undefined ? { href: showEscapes(r.href) } : {}) }));
}

/** Visible characters of a `text` element: markup and escapes removed, paragraph breaks (`\n\n`) not counted. */
export const pageInlineVisibleLength = (source: string): number =>
  parsePageInlineText(source).reduce((n, r) => n + r.text.replaceAll('\n\n', '').length, 0);

/** Link rule: every link of the text must carry a valid page href. */
export const isPageInlineTextValid = (text: string): boolean =>
  parsePageInlineText(text).every((r) => r.href === undefined || isPageHref(r.href));
const INLINE_MESSAGE = 'Link inválido. Use https://, /caminho ou #âncora.';
const TEXT_MESSAGE = `Máximo de ${L.textMax} caracteres.`;
const withinTextMax = (v: string) => v.length <= L.textRawMax && pageInlineVisibleLength(v) <= L.textMax;

// ---- style ----
const enumOf = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values);
const space = enumOf(SPACE_KEYS);
const backgroundSchema = z.discriminatedUnion('kind', [
  object({ kind: z.literal('color'), token: enumOf(COLOR_KEYS) }),
  object({ kind: z.literal('gradient'), token: enumOf(GRADIENT_KEYS) }),
  object({ kind: z.literal('image'), url: pageHttpsUrlSchema, scrim: z.literal('default') }),
]);
const STYLE_VALUE_SCHEMAS: Record<StyleKey, z.ZodTypeAny> = {
  typo: enumOf(TYPO_KEYS), color: enumOf(COLOR_KEYS), bg: backgroundSchema,
  p: space, pt: space, pb: space, pl: space, pr: space, gap: space, my: space, h: space,
  radius: enumOf(RADIUS_KEYS), border: enumOf(BORDER_KEYS), shadow: enumOf(SHADOW_KEYS),
  align: enumOf(ALIGN_KEYS), valign: enumOf(VALIGN_KEYS), halign: enumOf(ALIGN_KEYS),
  maxw: enumOf(MAXW_KEYS), width: enumOf(WIDTH_KEYS), minh: enumOf(MINH_KEYS),
  cols: z.union(COLS_KEYS.map((n) => z.literal(n)) as unknown as [z.ZodLiteral<number>, z.ZodLiteral<number>, ...z.ZodLiteral<number>[]]),
  ratio: enumOf(RATIO_KEYS), variant: enumOf(BUTTON_VARIANTS), size: enumOf(BUTTON_SIZES), full: z.boolean(), aspect: enumOf(ASPECT_KEYS),
};

const styleShape = (type: ElementType) =>
  Object.fromEntries((STYLE_KEYS_BY_TYPE[type] as readonly StyleKey[]).map((k) => [k, STYLE_VALUE_SCHEMAS[k].optional()]));

const ratioMatchesCols = (bp: { cols?: number; ratio?: string }) =>
  bp.cols === undefined || bp.ratio === undefined || bp.ratio.split('-').length === bp.cols;

/** Style accepted by one element type: only its own keys, tokens only, per breakpoint. */
export const styleSchemaFor = (type: ElementType) => {
  const bp = object(styleShape(type)).refine(ratioMatchesCols, { message: 'A proporção não bate com o número de colunas.', path: ['ratio'] });
  return object({ desktop: bp, tablet: bp.optional(), mobile: bp.optional() });
};

// ---- element props ----
const commonShape = (type: ElementType) => ({
  id: uuid,
  name: optText(L.nameMax),
  anchor: z.string().regex(ANCHOR_RE, 'Use só letras minúsculas, números e hífen (até 40).').optional(),
  hidden: object(Object.fromEntries(BREAKPOINTS.map((b) => [b, z.literal(true).optional()]))).optional(),
  style: styleSchemaFor(type).optional(),
  // Children are validated by the tree walk (nesting, depth, count), not here.
  ...(ELEMENT_SLOT_RULES[type] ? { items: z.array(z.unknown()).optional() } : {}),
});
const extra = <T extends z.ZodRawShape>(type: ElementType, shape: T) => object({ ...commonShape(type), ...shape });

export const elementPropsSchemas = {
  section: extra('section', {}),
  columns: extra('columns', {}),
  column: extra('column', {}),
  group: extra('group', {}),
  heading: extra('heading', { text: pageText(L.headingMax), tag: enumOf(HEADING_TAGS) }),
  text: extra('text', { text: pageText(L.textRawMax).refine(withinTextMax, TEXT_MESSAGE).refine(isPageInlineTextValid, INLINE_MESSAGE) }),
  label: extra('label', { text: pageText(L.labelMax) }),
  button: extra('button', { label: pageText(L.buttonLabelMax), href: pageHrefSchema, newTab: z.boolean().optional() }),
  image: extra('image', { url: pageHttpsUrlSchema, alt: pageText(L.altMax) }),
  video: extra('video', { url: videoUrlSchema }),
  divider: extra('divider', {}),
  spacer: extra('spacer', {}),
  iconList: extra('iconList', { items: list(pageText(L.iconListItemMax), 1, L.iconListMax) }),
  counter: extra('counter', { value: pageText(L.counterValueMax), label: pageText(L.counterLabelMax) }),
  faq: extra('faq', {
    items: list(object({ question: pageText(L.faqQuestionMax), answer: pageText(L.faqAnswerMax) }), 1, L.faqMax),
  }),
  plan: extra('plan', {
    name: pageText(L.planNameMax), price: pageText(L.planPriceMax), description: optText(L.planDescriptionMax), cta: pageCtaSchema.optional(),
  }),
  eventRail: sectionPropsSchemas.rail.extend(commonShape('eventRail')),
  featuredEvent: sectionPropsSchemas.featured.extend(commonShape('featuredEvent')),
  liveNow: extra('liveNow', {
    limit: z.union([z.literal(LIVE_NOW_LIMITS[0]), z.literal(LIVE_NOW_LIMITS[1])]),
    emptyText: pageText(L.emptyTextMax),
  }),
} satisfies Record<ElementType, z.ZodTypeAny>;

// ---- draft element props: content may be empty/missing, but whatever is filled in is as strict as the complete mode ----
const draftText = (max: number) => z.string().max(max, `Máximo de ${max} caracteres.`).optional();
const draftHref = z.string().refine((v) => v === '' || isPageHref(v), 'Link inválido. Use https://, /caminho ou #âncora.').optional();
const draftUrl = z.string().refine((v) => v === '' || isPageHttpsUrl(v), 'Use um endereço https://.').optional();
const draftVideo = z.string().refine((v) => v === '' || isPageVideoUrl(v), VIDEO_MESSAGE).optional();
const draftCta = object({ label: draftText(L1.ctaLabelMax), href: draftHref }).optional();

const DRAFT_CONTENT_SHAPES: Record<ElementType, z.ZodRawShape> = {
  section: {}, columns: {}, column: {}, group: {}, divider: {}, spacer: {},
  heading: { text: draftText(L.headingMax), tag: enumOf(HEADING_TAGS).optional() },
  text: { text: z.string().refine(withinTextMax, TEXT_MESSAGE).refine((v) => v === '' || isPageInlineTextValid(v), INLINE_MESSAGE).optional() },
  label: { text: draftText(L.labelMax) },
  button: { label: draftText(L.buttonLabelMax), href: draftHref, newTab: z.boolean().optional() },
  image: { url: draftUrl, alt: draftText(L.altMax) },
  video: { url: draftVideo },
  iconList: { items: z.array(z.string().max(L.iconListItemMax, `Máximo de ${L.iconListItemMax} caracteres.`)).max(L.iconListMax, `Máximo de ${L.iconListMax} itens.`).optional() },
  counter: { value: draftText(L.counterValueMax), label: draftText(L.counterLabelMax) },
  faq: { items: z.array(object({ question: draftText(L.faqQuestionMax), answer: draftText(L.faqAnswerMax) })).max(L.faqMax, `Máximo de ${L.faqMax} itens.`).optional() },
  plan: { name: draftText(L.planNameMax), price: draftText(L.planPriceMax), description: draftText(L.planDescriptionMax), cta: draftCta },
  eventRail: {
    title: draftText(L1.railTitleMax),
    source: object({ kind: z.enum(PAGE_RAIL_SOURCES), id: draftText(64) }).optional(),
    limit: sectionPropsSchemas.rail.shape.limit.optional(),
  },
  featuredEvent: { eventId: z.string().optional(), ctaLabel: draftText(L1.ctaLabelMax) },
  liveNow: { limit: elementPropsSchemas.liveNow.shape.limit.optional(), emptyText: draftText(L.emptyTextMax) },
};
const draftPropsSchema = (type: ElementType) => object({ ...commonShape(type), ...DRAFT_CONTENT_SHAPES[type] });

// ---- tree validation ----
export interface PageTreeIssue {
  /** Human path, e.g. `content[0].props.items[1].props.text`. */
  path: string;
  segments: (string | number)[];
  /** `props.id` of the element the issue belongs to, when known. */
  elementId?: string;
  message: string;
}

export interface ValidateTreeOptions {
  /** Autosave mode: structure, ids, styles and `{{` only; content props may be incomplete. */
  draft?: boolean;
}

const formatPath = (segments: (string | number)[]) =>
  segments.reduce<string>((acc, s) => (typeof s === 'number' ? `${acc}[${s}]` : acc ? `${acc}.${s}` : s), '');

const NON_TEXT_KEYS = new Set(['href', 'url', 'icon', 'eventId', 'kind', 'type', 'id', 'anchor', 'token']);
const bracePaths = (value: unknown, path: (string | number)[] = []): (string | number)[][] => {
  if (typeof value === 'string') return noBraces(value) ? [] : [path];
  if (Array.isArray(value)) return value.flatMap((v, i) => bracePaths(v, [...path, i]));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => (NON_TEXT_KEYS.has(k) ? [] : bracePaths(v, [...path, k])));
  }
  return [];
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function validatePageTreeV2(doc: PageDocumentV2, options: ValidateTreeOptions = {}): PageTreeIssue[] {
  const issues: PageTreeIssue[] = [];
  const add = (segments: (string | number)[], message: string, elementId?: string) =>
    issues.push({ path: formatPath(segments), segments, message, ...(elementId ? { elementId } : {}) });

  if (new TextEncoder().encode(JSON.stringify(doc)).length > L.maxBytes) add([], 'Página grande demais.');
  const content: unknown[] = Array.isArray(doc.content) ? doc.content : [];
  if (content.length > L.maxSections) add(['content'], `Máximo de ${L.maxSections} seções.`);

  let count = 0;
  let h1 = 0;
  const ids = new Set<string>();
  const anchors = new Set<string>();

  const walk = (node: unknown, segments: (string | number)[], depth: number, parent: ElementType | null) => {
    count += 1;
    if (!isRecord(node) || !isRecord(node.props) || !(ELEMENT_TYPES as readonly unknown[]).includes(node.type)) {
      return add(segments, 'Elemento inválido.');
    }
    const type = node.type as ElementType;
    const props = node.props;
    const elementId = typeof props.id === 'string' ? props.id : undefined;
    const fail = (sub: (string | number)[], message: string) => add([...segments, ...sub], message, elementId);

    const allowed = parent === null ? (['section'] as readonly ElementType[]) : ELEMENT_SLOT_RULES[parent];
    if (!allowed?.includes(type)) fail(['type'], parent === null ? 'A página só aceita seções.' : `"${type}" não pode ficar dentro de "${parent}".`);
    if (depth > L.maxDepth) return fail([], `Profundidade máxima de ${L.maxDepth} níveis.`);

    const schema = options.draft ? draftPropsSchema(type) : elementPropsSchemas[type];
    const parsed = schema.safeParse(props);
    if (!parsed.success) parsed.error.issues.forEach((i) => fail(['props', ...i.path], i.message));
    if (options.draft) bracePaths(props).forEach((p) => fail(['props', ...p], RESERVED_BRACES));

    if (elementId !== undefined) {
      if (ids.has(elementId)) fail(['props', 'id'], 'ID de elemento duplicado.');
      ids.add(elementId);
    }
    if (typeof props.anchor === 'string') {
      if (anchors.has(props.anchor)) fail(['props', 'anchor'], 'Âncora duplicada.');
      anchors.add(props.anchor);
    }
    if (type === 'heading' && props.tag === 'h1' && ++h1 > 1) fail(['props', 'tag'], 'A página só pode ter um título h1.');

    if (!ELEMENT_SLOT_RULES[type]) return;
    const children: unknown[] = Array.isArray(props.items) ? props.items : [];
    if (type === 'columns' && (children.length < 1 || children.length > L.maxColumns)) {
      fail(['props', 'items'], `Colunas aceita de 1 a ${L.maxColumns} colunas.`);
    }
    children.forEach((child, i) => walk(child, [...segments, 'props', 'items', i], depth + 1, type));
  };

  content.forEach((section, i) => walk(section, ['content', i], 1, null));
  if (count > L.maxElements) add([], `Máximo de ${L.maxElements} elementos.`);
  return issues;
}

// ---- documents ----
const shell = {
  schemaVersion: z.literal(2),
  context: pageContextSchema,
  root: object({ props: object({}) }),
  content: z.array(z.unknown(), { required_error: REQUIRED }),
};

const treeDocument = (draft: boolean) =>
  object(shell).superRefine((doc, ctx) =>
    validatePageTreeV2(doc as unknown as PageDocumentV2, { draft }).forEach((i) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: i.segments, message: i.message }),
    ),
  ) as unknown as z.ZodType<PageDocumentV2, z.ZodTypeDef, unknown>;

/** Complete v2 document, required to publish. */
export const pageDocumentV2Schema = treeDocument(false);
/** v2 structure only: content props may be incomplete so autosave never loses work. */
export const pageDraftV2Schema = treeDocument(true);

// ---- request vs response ----
// REQUEST: PUT /draft takes a v1 or v2 draft. Dispatch by schemaVersion so field errors keep their own path (not an `invalid_union` on `document`).
export interface SaveDraftRequest {
  document: z.infer<typeof pageDraftSchema> | PageDocumentV2;
  baseRevision: number;
}
export const saveDraftSchema = object({
  document: z.unknown(),
  baseRevision: z.number().int().min(0),
}).transform((value, ctx) => {
  const version = (value.document as { schemaVersion?: unknown } | null)?.schemaVersion;
  const schema = version === 1 ? pageDraftSchema : version === 2 ? pageDraftV2Schema : null;
  if (!schema) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['document', 'schemaVersion'], message: 'Versão do documento inválida. Use 1 ou 2.' });
    return z.NEVER;
  }
  const result = schema.safeParse(value.document);
  if (result.success) return { ...value, document: result.data } as SaveDraftRequest;
  result.error.issues.forEach((issue) => ctx.addIssue({ ...issue, path: ['document', ...issue.path] }));
  return z.NEVER;
});

// RESPONSE: the API converts v1 to v2 before answering, but readers stay tolerant of both versions.
export const pageDraftReadSchema = z.union([pageDraftV2Schema, pageDraftSchema]);
export const pageDocumentReadSchema = z.union([pageDocumentV2Schema, pageDocumentSchema]);
