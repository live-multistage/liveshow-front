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

export interface InsertionPoint { parentId: string | null; parentType: ElementType | null; index: number; zone: string }

/** Inside the selected element when it has a slot, right after it when it does not, at the end of the page when nothing is selected. */
export function insertionPoint(content: readonly PageElement[], selectedId: string | null): InsertionPoint {
  const found = selectedId ? locate(content, selectedId) : null;
  if (!found) return { parentId: null, parentType: null, index: content.length, zone: ROOT_ZONE };
  if (ELEMENT_SLOT_RULES[found.element.type]) {
    return { parentId: selectedId, parentType: found.element.type, index: childrenOf(found.element).length, zone: zoneOf(selectedId) };
  }
  const parentId = found.parent ? idOf(found.parent) : null;
  return { parentId, parentType: found.parent?.type ?? null, index: found.index + 1, zone: zoneOf(parentId) };
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

/** Copy of a subtree with a fresh id on every element (block insertion, duplicate). */
export const cloneWithNewIds = (element: PageElement): PageElement =>
  mapElements([structuredClone(element)], (el) => ({ ...el, props: { ...el.props, id: crypto.randomUUID() } } as PageElement))[0];

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
