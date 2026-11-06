import {
  STYLE_KEYS_BY_TYPE, type Breakpoint, type ElementType, type PageTreeIssue, type StyleKey,
} from '@live-show/api-contracts';

// Pure helpers of the inspector: responsive style (desktop is the base, tablet/mobile hold overrides) and issue grouping.
// Props are handled as plain records: the document is validated by the contract, not by the types here.
type Props = Record<string, unknown>;
type StyleBag = Record<string, unknown>;

const BP_ORDER: readonly Breakpoint[] = ['desktop', 'tablet', 'mobile'];
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

const styleOf = (props: Props): Record<string, StyleBag> => (isRecord(props.style) ? (props.style as Record<string, StyleBag>) : {});

/** Style keys that apply at `bp`: desktop, overridden by tablet, overridden by mobile. */
export function effectiveStyle(props: Props, bp: Breakpoint): StyleBag {
  const style = styleOf(props);
  return BP_ORDER.slice(0, BP_ORDER.indexOf(bp) + 1).reduce<StyleBag>((acc, name) => ({ ...acc, ...style[name] }), {});
}

/** The key is set at this breakpoint itself (desktop is the base, never an "override"). */
export const ownsKey = (props: Props, bp: Breakpoint, key: StyleKey): boolean =>
  bp !== 'desktop' && isRecord(styleOf(props)[bp]) && key in styleOf(props)[bp]!;

/** Where the value shown at `bp` comes from when it is not set there. */
export const inheritedFrom = (props: Props, bp: Breakpoint, key: StyleKey): 'desktop' | 'tablet' =>
  bp === 'mobile' && isRecord(styleOf(props).tablet) && key in styleOf(props).tablet! ? 'tablet' : 'desktop';

const ratioFits = (cols: unknown, ratio: unknown) => typeof ratio === 'string' && ratio.split('-').length === cols;

export function withStyleValue(props: Props, bp: Breakpoint, key: StyleKey, value: unknown): Props {
  const style = styleOf(props);
  let next: StyleBag = { ...style[bp], [key]: value };
  // The contract refuses a ratio whose parts differ from `cols` inside one breakpoint.
  if (key === 'cols' && 'ratio' in next && !ratioFits(value, next.ratio)) {
    const { ratio: _ratio, ...rest } = next;
    next = rest;
  }
  return { ...props, style: { desktop: {}, ...style, [bp]: next } };
}

export function withoutStyleKey(props: Props, bp: Breakpoint, key: StyleKey): Props {
  const style = styleOf(props);
  const { [key]: _removed, ...rest } = style[bp] ?? {};
  const { [bp]: _bp, ...others } = style;
  const kept = bp === 'desktop' || Object.keys(rest).length > 0 ? { [bp]: rest } : {};
  return { ...props, style: { desktop: {}, ...others, ...kept } };
}

// ---- which control groups an element type shows (keys always come from the contract) ----
const GROUP_OF: Record<StyleKey, string> = {
  typo: 'text', color: 'text', align: 'text', maxw: 'text',
  variant: 'button', size: 'button', full: 'button',
  bg: 'background',
  p: 'spacing', pt: 'spacing', pb: 'spacing', pl: 'spacing', pr: 'spacing', gap: 'spacing', my: 'spacing', h: 'spacing',
  radius: 'box', border: 'box', shadow: 'box',
  width: 'layout', minh: 'layout', halign: 'layout', valign: 'layout', cols: 'layout', ratio: 'layout',
  aspect: 'aspect',
};
export const STYLE_GROUPS = ['aspect', 'text', 'button', 'background', 'layout', 'spacing', 'box'] as const;

export function styleKeyGroups(type: ElementType): { group: (typeof STYLE_GROUPS)[number]; keys: StyleKey[] }[] {
  const keys = STYLE_KEYS_BY_TYPE[type] as readonly StyleKey[];
  return STYLE_GROUPS
    .map((group) => ({ group, keys: keys.filter((key) => GROUP_OF[key] === group) }))
    .filter((entry) => entry.keys.length > 0);
}

// ---- issues ----
export interface ElementIssue {
  /** Field of the element's own props the issue belongs to (`href`, `style.mobile.shadow`, `items.2`). */
  path: string;
  message: string;
}

/** Path of an issue relative to the props of the element it belongs to. */
export function fieldOf({ segments }: Pick<PageTreeIssue, 'segments'>): string {
  const last = segments[segments.length - 1];
  if (last === 'type') return 'type';
  return segments.slice(segments.lastIndexOf('props') + 1).join('.');
}

export function groupIssues(issues: readonly PageTreeIssue[]): Map<string, ElementIssue[]> {
  const byElement = new Map<string, ElementIssue[]>();
  for (const issue of issues) {
    if (!issue.elementId) continue;
    byElement.set(issue.elementId, [...(byElement.get(issue.elementId) ?? []), { path: fieldOf(issue), message: issue.message }]);
  }
  return byElement;
}
