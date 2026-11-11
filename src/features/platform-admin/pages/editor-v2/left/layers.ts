import {
  childrenOf, formatPath, walkElements, type Breakpoint, type ElementType, type PageElement, type PageTreeIssue,
} from '@live-show/api-contracts';
import { canNest, idOf } from './tree-ops';

export interface LayerRow {
  id: string;
  type: ElementType;
  depth: number;
  name: string;
  hasChildren: boolean;
  collapsed: boolean;
  /** `T`, `C` or `T·C`: tablet and/or mobile (celular) style overrides. */
  overrides: string;
  /** The element, or something inside it, has a validation error. */
  error: boolean;
  hiddenHere: boolean;
  canUp: boolean;
  canDown: boolean;
  canOutdent: boolean;
  saveable: boolean;
}

const SNIPPET_MAX = 24;
const SNIPPET_PROPS = ['text', 'label', 'name', 'value', 'question'] as const;
const SAVEABLE = ['section', 'columns', 'column'];

/** Every document path that is an ancestor-or-self of an issue: an element with a key here has an error inside it. */
export function errorKeysOf(issues: readonly PageTreeIssue[]): Set<string> {
  const keys = new Set<string>();
  issues.forEach(({ segments }) => segments.forEach((_, i) => keys.add(formatPath(segments.slice(0, i + 1)))));
  return keys;
}

function displayName(element: PageElement, typeLabel: string): string {
  const props = element.props as unknown as Record<string, unknown>;
  if (typeof props.name === 'string' && props.name) return props.name;
  const raw = SNIPPET_PROPS.map((p) => props[p]).find((v): v is string => typeof v === 'string' && v.trim() !== '');
  if (!raw) return typeLabel;
  const clean = raw.replace(/\s+/g, ' ').trim();
  return `${typeLabel} · ${clean.length > SNIPPET_MAX ? `${clean.slice(0, SNIPPET_MAX)}…` : clean}`;
}

function overridesOf(element: PageElement): string {
  const style = (element.props as { style?: { tablet?: object; mobile?: object } }).style;
  const marks = [Object.keys(style?.tablet ?? {}).length ? 'T' : '', Object.keys(style?.mobile ?? {}).length ? 'C' : ''];
  return marks.filter(Boolean).join('·');
}

/** Flat, depth-annotated rows of the visible part of the tree (children of collapsed elements are skipped). */
export function buildLayerRows(
  content: readonly PageElement[],
  options: { collapsed: ReadonlySet<string>; breakpoint: Breakpoint; errorKeys: ReadonlySet<string>; typeLabel(type: ElementType): string },
): LayerRow[] {
  const parents = new Map<string, PageElement | null>();
  walkElements(content, (el, { parent }) => void parents.set(idOf(el), parent));

  const rows: LayerRow[] = [];
  walkElements(content, (el, { parent, index, depth, segments }) => {
    const id = idOf(el);
    const siblings = parent ? childrenOf(parent) : content;
    const grandparent = parent ? parents.get(idOf(parent)) ?? null : null;
    const hasChildren = childrenOf(el).length > 0;
    const collapsed = hasChildren && options.collapsed.has(id);
    rows.push({
      id, type: el.type, depth: depth - 1, hasChildren, collapsed,
      name: displayName(el, options.typeLabel(el.type)),
      overrides: overridesOf(el),
      error: options.errorKeys.has(formatPath(['content', ...segments])),
      hiddenHere: !!(el.props as { hidden?: Partial<Record<Breakpoint, true>> }).hidden?.[options.breakpoint],
      canUp: index > 0,
      canDown: index < siblings.length - 1,
      canOutdent: !!parent && canNest(grandparent?.type ?? null, el.type),
      saveable: SAVEABLE.includes(el.type),
    });
    return !collapsed;
  });
  return rows;
}
