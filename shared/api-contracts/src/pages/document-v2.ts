// Page document v2 (element tree). Contract source of truth: docs/specs/2026-11-06-page-builder-v2-sdd.md §2.
//
// Token enums below are DUPLICATED as `as const` from packages/design-tokens on purpose: the copy of this package
// vendored into live-show-react (`shared/api-contracts`) has no sibling design-tokens, so it cannot import it.
// packages/design-tokens/src/tokens.test.ts asserts these lists stay equal to the tokens.
import type { PageContextType, RailProps } from './types';

export const BREAKPOINTS = ['desktop', 'tablet', 'mobile'] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

export const ELEMENT_TYPES = [
  'section', 'columns', 'column', 'group',
  'heading', 'text', 'label', 'button', 'image', 'video', 'divider', 'spacer',
  'iconList', 'counter', 'faq', 'plan',
  'eventRail', 'featuredEvent', 'liveNow',
] as const;
export type ElementType = (typeof ELEMENT_TYPES)[number];

const LEAF_TYPES = ELEMENT_TYPES.filter((t) => !['section', 'columns', 'column', 'group'].includes(t));
const INNER_TYPES = ELEMENT_TYPES.filter((t) => t !== 'section' && t !== 'column');

/** What each slot accepts as children; `null` = the type has no slot. */
export const ELEMENT_SLOT_RULES: Record<ElementType, readonly ElementType[] | null> = {
  section: INNER_TYPES,
  columns: ['column'],
  column: INNER_TYPES,
  group: LEAF_TYPES,
  heading: null, text: null, label: null, button: null, image: null, video: null, divider: null, spacer: null,
  iconList: null, counter: null, faq: null, plan: null, eventRail: null, featuredEvent: null, liveNow: null,
};
export type SlotElementType = 'section' | 'columns' | 'column' | 'group';

export const PAGE_V2_LIMITS = {
  maxElements: 400, maxSections: 40, maxDepth: 6, maxBytes: 512 * 1024, maxColumns: 4,
  nameMax: 40, anchorMax: 40, headingMax: 90, textMax: 2000, labelMax: 40, buttonLabelMax: 28, altMax: 140,
  iconListMax: 12, iconListItemMax: 120, counterValueMax: 12, counterLabelMax: 40,
  faqMax: 20, faqQuestionMax: 160, faqAnswerMax: 1000, planNameMax: 40, planPriceMax: 24, planDescriptionMax: 200,
  emptyTextMax: 80,
} as const;

export const ANCHOR_RE = /^[a-z0-9-]{1,40}$/;
export const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4'] as const;
export type HeadingTag = (typeof HEADING_TAGS)[number];
export const LIVE_NOW_LIMITS = [4, 8] as const;

/** Closed list: video.url must be https on one of these hosts (exact match). */
export const VIDEO_ALLOWED_HOSTS = [
  'www.youtube.com', 'youtube.com', 'youtu.be', 'www.youtube-nocookie.com', 'player.vimeo.com', 'vimeo.com',
  // Platform media library
  'showon.io', 'www.showon.io', 'cdn.showon.io',
] as const;

// ---- style tokens (keys only; the document never stores px or hex) ----
export const SPACE_KEYS = ['0', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl', 'l1', 'l2', 'l3'] as const;
export const TYPO_KEYS = ['hero', 'display', 'xxl', 'xl', 'lg', 'md', 'sm', 'label'] as const;
export const COLOR_KEYS = [
  'bg', 'surface', 'surfaceDark', 'accent', 'action', 'violet', 'price', 'textPrimary', 'textSecondary', 'textMuted', 'border',
] as const;
export const SHADOW_KEYS = ['none', 'card', 'glow'] as const;
export const RADIUS_KEYS = ['none', 'sm', 'md', 'lg', 'full'] as const;
export const BORDER_KEYS = ['none', 'faint', 'default', 'strong', 'accent'] as const;
export const GRADIENT_KEYS = ['glow', 'duo', 'night'] as const;
export const ALIGN_KEYS = ['start', 'center', 'end'] as const;
export const VALIGN_KEYS = ['start', 'center', 'end', 'stretch'] as const;
export const MAXW_KEYS = ['narrow', 'prose'] as const;
export const WIDTH_KEYS = ['narrow', 'contained', 'wide', 'full'] as const;
export const MINH_KEYS = ['tall', 'screen'] as const;
export const COLS_KEYS = [1, 2, 3, 4] as const;
export const RATIO_KEYS = ['1-1', '2-1', '1-2', '3-2', '1-1-1', '2-1-1', '1-2-1', '1-1-1-1'] as const;
export const BUTTON_VARIANTS = ['primary', 'secondary', 'light', 'ghost'] as const;
export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
export const ASPECT_KEYS = ['16:9', '4:3', '1:1', '4:5', '21:9'] as const;

export type SpaceKey = (typeof SPACE_KEYS)[number];
export type TypoKey = (typeof TYPO_KEYS)[number];
export type ColorKey = (typeof COLOR_KEYS)[number];
export type ShadowKey = (typeof SHADOW_KEYS)[number];
export type RadiusKey = (typeof RADIUS_KEYS)[number];
export type BorderKey = (typeof BORDER_KEYS)[number];
export type GradientKey = (typeof GRADIENT_KEYS)[number];

export type PageBackground =
  | { kind: 'color'; token: ColorKey }
  | { kind: 'gradient'; token: GradientKey }
  | { kind: 'image'; url: string; scrim: 'default' };

export interface StyleProps {
  typo: TypoKey;
  color: ColorKey;
  bg: PageBackground;
  p: SpaceKey; pt: SpaceKey; pb: SpaceKey; pl: SpaceKey; pr: SpaceKey; gap: SpaceKey; my: SpaceKey; h: SpaceKey;
  radius: RadiusKey;
  border: BorderKey;
  shadow: ShadowKey;
  align: (typeof ALIGN_KEYS)[number];
  valign: (typeof VALIGN_KEYS)[number];
  halign: (typeof ALIGN_KEYS)[number];
  maxw: (typeof MAXW_KEYS)[number];
  width: (typeof WIDTH_KEYS)[number];
  minh: (typeof MINH_KEYS)[number];
  cols: (typeof COLS_KEYS)[number];
  ratio: (typeof RATIO_KEYS)[number];
  variant: (typeof BUTTON_VARIANTS)[number];
  size: (typeof BUTTON_SIZES)[number];
  full: boolean;
  aspect: (typeof ASPECT_KEYS)[number];
}
export type StyleKey = keyof StyleProps;
export const STYLE_VALUE_KEYS = [
  'typo', 'color', 'bg', 'p', 'pt', 'pb', 'pl', 'pr', 'gap', 'my', 'h', 'radius', 'border', 'shadow', 'align', 'valign',
  'halign', 'maxw', 'width', 'minh', 'cols', 'ratio', 'variant', 'size', 'full', 'aspect',
] as const satisfies readonly StyleKey[];

const BOX = ['radius', 'border', 'shadow'] as const;
/** Style keys each element type accepts (SDD §2.3). Anything else is rejected. */
export const STYLE_KEYS_BY_TYPE = {
  section: ['bg', 'pt', 'pb', 'pl', 'pr', 'gap', ...BOX, 'width', 'minh'],
  columns: ['gap', 'cols', 'ratio', 'valign', 'my'],
  column: ['bg', 'p', 'pt', 'pb', 'pl', 'pr', 'gap', ...BOX],
  group: ['gap', 'halign', 'my'],
  heading: ['typo', 'color', 'align', 'maxw', 'my'],
  text: ['typo', 'color', 'align', 'maxw', 'my'],
  label: ['typo', 'color', 'align', 'my'],
  button: ['variant', 'size', 'full', 'my'],
  image: ['aspect', ...BOX, 'my'],
  video: ['aspect', ...BOX, 'my'],
  divider: ['color', 'my'],
  spacer: ['h'],
  iconList: ['typo', 'color', 'gap', 'my'],
  counter: ['typo', 'color', 'align', 'my'],
  faq: ['my'],
  plan: ['bg', 'p', ...BOX, 'my'],
  eventRail: ['my'],
  featuredEvent: ['my'],
  liveNow: ['my'],
} as const satisfies Record<ElementType, readonly StyleKey[]>;
export type StyleKeysOf<T extends ElementType> = (typeof STYLE_KEYS_BY_TYPE)[T][number];

export type ResponsiveStyle<K extends StyleKey = StyleKey> = {
  desktop: Partial<Pick<StyleProps, K>>; // base; keys omitted fall back to renderer defaults
  tablet?: Partial<Pick<StyleProps, K>>; // overrides desktop
  mobile?: Partial<Pick<StyleProps, K>>; // overrides tablet, or desktop when tablet has no value
};

// ---- element props ----
export interface ElementContentPropsByType {
  section: object;
  columns: object;
  column: object;
  group: object;
  heading: { text: string; tag: HeadingTag };
  /** Inline markup of the v1 editor: `**bold**`, `*italic*`, `[label](href)`. */
  text: { text: string };
  label: { text: string };
  button: { label: string; href: string; newTab?: boolean };
  image: { url: string; alt: string };
  video: { url: string };
  divider: object;
  spacer: object;
  iconList: { items: string[] };
  counter: { value: string; label: string };
  faq: { items: { question: string; answer: string }[] };
  plan: { name: string; price: string; description?: string; cta?: { label: string; href: string } };
  eventRail: RailProps;
  featuredEvent: { eventId: string; ctaLabel?: string };
  liveNow: { limit: (typeof LIVE_NOW_LIMITS)[number]; emptyText: string };
}

export type ElementProps<T extends ElementType = ElementType> = {
  [K in T]: ElementContentPropsByType[K] & {
    id: string;
    name?: string;
    anchor?: string;
    hidden?: Partial<Record<Breakpoint, true>>;
    style?: ResponsiveStyle<StyleKeysOf<K>>;
    locked?: true; // reserved (SDD §6.4); v2 never writes it
  } & (K extends SlotElementType ? { items?: PageElement[] } : object);
}[T];

export type PageElement<T extends ElementType = ElementType> = {
  [K in T]: { type: K; props: ElementProps<K> };
}[T];

export interface PageDocumentV2 {
  schemaVersion: 2;
  context: { type: PageContextType };
  root: { props: Record<string, never> };
  content: PageElement<'section'>[];
}
