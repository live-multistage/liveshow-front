import { z } from 'zod';
import { PAGE_V2_LIMITS, type PageElement, type PageDocumentV2 } from './document-v2';
import { countElements, formatPath, walkElements } from './page-tree';
import { validatePageAgainstProfile } from './profiles';
import { validatePageTreeV2, type PageTreeIssue } from './schemas-v2';

export const PAGE_BLOCK_LIMITS = { nameMax: 60, maxBytes: 64 * 1024, maxElements: 200 } as const;
export const PAGE_BLOCK_ROOT_TYPES = ['section', 'columns', 'column'] as const;

export interface PageBlockResponse {
  id: string;
  name: string;
  element: PageElement;
  createdAt: string;
  createdBy: { id: string; name: string } | null;
  updatedAt: string;
}

export interface PageBlockListResponse {
  items: PageBlockResponse[];
}

// Fixed ids for the ancestors added only to build a valid document around the block.
const WRAPPER_IDS = ['00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000a2'];
const wrapper = (type: 'section' | 'columns', id: string, child: unknown) => ({ type, props: { id, items: [child] } });

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

// A block may not carry the ids reserved for its wrapper ancestors, at any depth.
const reservedIdIssues = (element: PageElement): PageTreeIssue[] => {
  const issues: PageTreeIssue[] = [];
  walkElements([element], (node, { segments: [, ...rest] }) => {
    const id = isRecord(node) && isRecord(node.props) ? node.props.id : undefined;
    if (typeof id !== 'string' || !WRAPPER_IDS.includes(id)) return;
    const segments = [...rest, 'props', 'id'];
    issues.push({ path: formatPath(segments), segments, message: 'ID reservado pelo sistema.' });
  });
  return issues;
};

/** Validates a saved block (section, columns or column) by wrapping it in the ancestors it needs inside a v2 document. */
export function validatePageBlockElement(element: unknown): PageTreeIssue[] {
  const type = isRecord(element) ? element.type : undefined;
  if (!(PAGE_BLOCK_ROOT_TYPES as readonly unknown[]).includes(type)) {
    return [{ path: 'type', segments: ['type'], message: 'O bloco precisa ser uma seção, colunas ou uma coluna.' }];
  }
  if (new TextEncoder().encode(JSON.stringify(element)).length > PAGE_BLOCK_LIMITS.maxBytes) {
    return [{ path: '', segments: [], message: 'Bloco grande demais.' }];
  }
  const issues: PageTreeIssue[] = [];
  if (countElements([element as PageElement]) > PAGE_BLOCK_LIMITS.maxElements) {
    issues.push({ path: '', segments: [], message: `Máximo de ${PAGE_BLOCK_LIMITS.maxElements} elementos.` });
  }
  issues.push(...reservedIdIssues(element as PageElement));

  const [sectionId, columnsId] = WRAPPER_IDS;
  const content = type === 'section' ? element
    : wrapper('section', sectionId, type === 'columns' ? element : wrapper('columns', columnsId, element));
  const depth = type === 'section' ? 0 : type === 'columns' ? 1 : 2;
  const doc = { schemaVersion: 2, context: { type: 'none' }, root: { props: {} }, content: [content] } as unknown as PageDocumentV2;

  const strip = 2 + depth * 3; // ['content', 0] plus ['props', 'items', 0] per wrapper
  const inner = [...validatePageTreeV2(doc), ...(issues.length ? [] : validatePageAgainstProfile(doc, 'platform'))]
    .filter((i) => i.segments.length >= strip)
    .map((i) => {
      const segments = i.segments.slice(strip);
      return { ...i, segments, path: formatPath(segments) };
    });
  return [...issues, ...inner];
}

const blockName = z.string({ required_error: 'Obrigatório.' }).trim().min(1, 'Obrigatório.').max(PAGE_BLOCK_LIMITS.nameMax, `Máximo de ${PAGE_BLOCK_LIMITS.nameMax} caracteres.`);

export const createPageBlockSchema = z.object({ name: blockName, element: z.unknown() }).strict().superRefine((value, ctx) => {
  validatePageBlockElement(value.element).forEach((i) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['element', ...i.segments], message: i.message }));
}).transform((v) => v as { name: string; element: PageElement });
export type CreatePageBlockRequest = z.infer<typeof createPageBlockSchema>;

export const updatePageBlockSchema = z.object({ name: blockName }).strict();
export type UpdatePageBlockRequest = z.infer<typeof updatePageBlockSchema>;
