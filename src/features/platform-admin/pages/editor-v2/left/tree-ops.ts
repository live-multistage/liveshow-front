import {
  ELEMENT_SLOT_RULES, childrenOf, mapElements, walkElements, type Breakpoint, type ElementType, type PageElement,
} from '@live-show/api-contracts';

/** Zone Puck gives the page root (see puck-config). */
export const ROOT_ZONE = 'root:default-zone';
export const zoneOf = (parentId: string | null) => (parentId ? `${parentId}:items` : ROOT_ZONE);

export const idOf = (element: PageElement): string => (element.props as { id: string }).id;

/** The nesting table of the contract; `null` is the page root, which only takes sections. */
export function canNest(parentType: ElementType | null, childType: ElementType): boolean {
  if (parentType === null) return childType === 'section';
  return !!ELEMENT_SLOT_RULES[parentType]?.includes(childType);
}

export interface Located { element: PageElement; parent: PageElement | null; index: number }

export function locate(content: readonly PageElement[], id: string): Located | null {
  let found: Located | null = null;
  walkElements(content, (element, { parent, index }) => {
    if (found) return false;
    if (idOf(element) === id) found = { element, parent, index };
  });
  return found;
}

/** Ancestors from the page's section down to the element itself (`[]` when it is not in the tree). */
export function pathTo(content: readonly PageElement[], id: string): PageElement[] {
  const path: PageElement[] = [];
  let at = locate(content, id);
  while (at) {
    path.unshift(at.element);
    at = at.parent ? locate(content, idOf(at.parent)) : null;
  }
  return path;
}

export interface InsertionPoint { parentId: string | null; parentType: ElementType | null; index: number; zone: string }

const pointIn = (parentId: string | null, parentType: ElementType | null, index: number): InsertionPoint =>
  ({ parentId, parentType, index, zone: zoneOf(parentId) });

/**
 * Where a click inserts. Candidates, closest first: inside the selection (when it has a slot), then right after it, then right
 * after each ancestor. With `type`, the first candidate whose parent accepts it wins; none fits (or no `type`): the closest one.
 * Nothing selected: the end of the page.
 */
export function insertionPoint(content: readonly PageElement[], selectedId: string | null, type: ElementType | null = null): InsertionPoint {
  let current = selectedId ? locate(content, selectedId) : null;
  if (!current) return pointIn(null, null, content.length);
  const candidates: InsertionPoint[] = [];
  if (ELEMENT_SLOT_RULES[current.element.type]) candidates.push(pointIn(selectedId, current.element.type, childrenOf(current.element).length));
  while (current) {
    const parent: PageElement | null = current.parent;
    candidates.push(pointIn(parent ? idOf(parent) : null, parent?.type ?? null, current.index + 1));
    current = parent ? locate(content, idOf(parent)) : null;
  }
  return (type && candidates.find((c) => canNest(c.parentType, type))) || candidates[0];
}

/** Rewrites the children list of `parentId` (`null` = the page). */
function withChildren(content: readonly PageElement[], parentId: string | null, change: (children: PageElement[]) => PageElement[]): PageElement[] {
  if (parentId === null) return change([...content]);
  return mapElements(content, (el) =>
    idOf(el) === parentId && ELEMENT_SLOT_RULES[el.type]
      ? ({ ...el, props: { ...el.props, items: change([...childrenOf(el)]) } } as PageElement)
      : el);
}

export const insertAt = (content: readonly PageElement[], parentId: string | null, index: number, element: PageElement) =>
  withChildren(content, parentId, (children) => [...children.slice(0, index), element, ...children.slice(index)]);

const demoteH1 = (el: PageElement): PageElement =>
  el.type === 'heading' && el.props.tag === 'h1' ? ({ ...el, props: { ...el.props, tag: 'h2' } } as PageElement) : el;

const withoutAnchor = (el: PageElement): PageElement => {
  const { anchor: _anchor, ...props } = el.props as { anchor?: string };
  return { ...el, props } as PageElement;
};

/** Copy of a subtree with a fresh id on every element (block insertion, duplicate). A copy cannot repeat the anchor or the h1 of its source: the draft validator refuses both. */
export const cloneWithNewIds = (element: PageElement): PageElement =>
  mapElements([structuredClone(element)], (el) => demoteH1(withoutAnchor({ ...el, props: { ...el.props, id: crypto.randomUUID() } } as PageElement)))[0];

/** Puck's own duplicate copies anchors and h1: keeps the first of each in the tree and clears the repeats (the first h1 stays). */
export function withoutClashes(content: readonly PageElement[]): PageElement[] {
  const anchors = new Set<string>();
  let h1 = 0;
  return mapElements(content, (el) => {
    let next = el;
    const anchor = (el.props as { anchor?: string }).anchor;
    if (anchor) next = anchors.has(anchor) ? withoutAnchor(next) : (anchors.add(anchor), next);
    if (next.type === 'heading' && next.props.tag === 'h1' && ++h1 > 1) next = demoteH1(next);
    return next;
  });
}

/**
 * Moves `id` under `parentId` at `index` (the position among the target's children before the removal).
 * `null` when the move breaks the nesting table or drops an element into its own subtree.
 */
export function moveElement(content: readonly PageElement[], id: string, parentId: string | null, index: number): PageElement[] | null {
  const from = locate(content, id);
  if (!from) return null;
  const target = parentId ? locate(content, parentId) : null;
  if (parentId && !target) return null;
  if (!canNest(target?.element.type ?? null, from.element.type)) return null;
  let intoItself = false;
  walkElements([from.element], (el) => { if (idOf(el) === parentId) intoItself = true; });
  if (intoItself) return null;

  const fromParentId = from.parent ? idOf(from.parent) : null;
  const at = fromParentId === parentId && from.index < index ? index - 1 : index;
  const without = withChildren(content, fromParentId, (children) => children.filter((c) => idOf(c) !== id));
  return insertAt(without, parentId, at, from.element);
}

export function setHiddenAt(content: readonly PageElement[], id: string, breakpoint: Breakpoint, hidden: boolean): PageElement[] {
  return mapElements(content, (el) => {
    if (idOf(el) !== id) return el;
    const { hidden: current, ...rest } = el.props as { hidden?: Partial<Record<Breakpoint, true>> };
    const { [breakpoint]: _removed, ...others } = current ?? {};
    const next = hidden ? { ...others, [breakpoint]: true } : others;
    return { ...el, props: { ...rest, ...(Object.keys(next).length ? { hidden: next } : {}) } } as PageElement;
  });
}
