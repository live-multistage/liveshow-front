import { ELEMENT_SLOT_RULES, type ElementType, type PageDocumentV2, type PageElement } from './document-v2';

// The ONLY way to traverse a v2 element tree. `props.items` means "children" on slot types (section, columns, column,
// group) and "content" on iconList (string[]) and faq ({question, answer}[]). Never read `props.items` by hand: go through
// `childrenOf`. Input may be untrusted (it runs before validation), so every helper tolerates malformed nodes.

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

const hasSlot = (el: unknown): el is PageElement =>
  isRecord(el) && isRecord(el.props) && typeof el.type === 'string' && Object.hasOwn(ELEMENT_SLOT_RULES, el.type) && ELEMENT_SLOT_RULES[el.type as ElementType] !== null;

/** Children of an element; `[]` for types without a slot (their `items` is opaque content) and for malformed nodes. */
export function childrenOf(el: PageElement): PageElement[] {
  if (!hasSlot(el)) return [];
  const items = (el.props as { items?: unknown }).items;
  return Array.isArray(items) ? (items as PageElement[]) : [];
}

export const formatPath = (segments: (string | number)[]): string =>
  segments.reduce<string>((acc, s) => (typeof s === 'number' ? `${acc}[${s}]` : acc ? `${acc}.${s}` : s), '');

export interface WalkContext {
  parent: PageElement | null;
  index: number;
  /** 1 for top-level elements. */
  depth: number;
  /** e.g. `content[0].props.items[1]` for a document, `[0].props.items[1]` for a bare list. */
  path: string;
  segments: (string | number)[];
}

/** Pre-order walk. `visit` returning `false` skips that element's children. */
export function walkElements(
  source: PageDocumentV2 | readonly PageElement[],
  visit: (el: PageElement, ctx: WalkContext) => boolean | void,
): void {
  const walk = (nodes: readonly PageElement[], base: (string | number)[], parent: PageElement | null, depth: number) =>
    nodes.forEach((el, index) => {
      const segments = [...base, index];
      if (visit(el, { parent, index, depth, path: formatPath(segments), segments }) === false) return;
      walk(childrenOf(el), [...segments, 'props', 'items'], el, depth + 1);
    });

  if (Array.isArray(source)) return walk(source, [], null, 1);
  const content = (source as PageDocumentV2).content;
  walk(Array.isArray(content) ? content : [], ['content'], null, 1);
}

/** Immutable post-order map: children are mapped first, then `fn` sees the element with its new children. Content arrays are kept as is. */
export function mapElements(elements: readonly PageElement[], fn: (el: PageElement) => PageElement): PageElement[] {
  return elements.map((el) => {
    if (!hasSlot(el) || !Array.isArray((el.props as { items?: unknown }).items)) return fn(el);
    return fn({ ...el, props: { ...el.props, items: mapElements(childrenOf(el), fn) } } as PageElement);
  });
}

/** The element without its children (`props.items` removed on slot types only). */
export function withoutChildren(el: PageElement): PageElement {
  if (!hasSlot(el)) return el;
  const { items: _items, ...props } = el.props as { items?: unknown };
  return { ...el, props } as PageElement;
}

export function countElements(source: PageDocumentV2 | readonly PageElement[]): number {
  let n = 0;
  walkElements(source, () => void (n += 1));
  return n;
}
