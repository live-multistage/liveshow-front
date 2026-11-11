import {
  ALIGN_KEYS, ASPECT_KEYS, BORDER_KEYS, BREAKPOINTS, BUTTON_SIZES, BUTTON_VARIANTS, COLOR_KEYS, COLS_KEYS, GRADIENT_KEYS,
  MAXW_KEYS, MINH_KEYS, RADIUS_KEYS, RATIO_KEYS, SHADOW_KEYS, SPACE_KEYS, STYLE_KEYS_BY_TYPE, TYPO_KEYS, VALIGN_KEYS, WIDTH_KEYS,
  type Breakpoint, type ElementType, type ResponsiveStyle, type StyleKey,
} from '@live-show/api-contracts';
import styles from './style.module.scss';

/** Allowed values per style key (everything but `bg`, which is an object). Anything else never becomes a class. */
export const STYLE_VALUES: Record<StyleKey, readonly (string | number | boolean)[]> = {
  typo: TYPO_KEYS, color: COLOR_KEYS, bg: [],
  p: SPACE_KEYS, pt: SPACE_KEYS, pb: SPACE_KEYS, pl: SPACE_KEYS, pr: SPACE_KEYS, gap: SPACE_KEYS, my: SPACE_KEYS, h: SPACE_KEYS,
  radius: RADIUS_KEYS, border: BORDER_KEYS, shadow: SHADOW_KEYS,
  align: ALIGN_KEYS, valign: VALIGN_KEYS, halign: ALIGN_KEYS, maxw: MAXW_KEYS, width: WIDTH_KEYS, minh: MINH_KEYS,
  cols: COLS_KEYS, ratio: RATIO_KEYS, variant: BUTTON_VARIANTS, size: BUTTON_SIZES, full: [true, false], aspect: ASPECT_KEYS,
};

const STEM: Record<Exclude<StyleKey, 'bg'>, string> = {
  typo: 'ty', color: 'c', p: 'p', pt: 'pt', pb: 'pb', pl: 'pl', pr: 'pr', gap: 'gap', my: 'my', h: 'h',
  radius: 'r', border: 'bd', shadow: 'sh', align: 'al', valign: 'va', halign: 'ha', maxw: 'mw', width: 'w', minh: 'mh',
  cols: 'cols', ratio: 'ratio', variant: 'v', size: 'sz', full: 'full', aspect: 'as',
};

const PREFIX: Record<Breakpoint, string> = { desktop: '', tablet: 't-', mobile: 'm-' };
const HIDE: Record<Breakpoint, string> = { desktop: 'hide-d', tablet: 'hide-t', mobile: 'hide-m' };

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function bgClass(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (value.kind === 'image') return 'bg-image';
  if (value.kind === 'color' && (COLOR_KEYS as readonly unknown[]).includes(value.token)) return `bg-c-${String(value.token)}`;
  if (value.kind === 'gradient' && (GRADIENT_KEYS as readonly unknown[]).includes(value.token)) return `bg-g-${String(value.token)}`;
  return null;
}

/**
 * Class keys (names inside style.module.scss) for an element's responsive style. Only keys the type accepts and values of
 * the token enums are honoured; everything else is dropped, so document data can never reach a class name unchecked.
 */
export function styleClassKeys(
  type: ElementType,
  style: ResponsiveStyle | undefined,
  hidden?: Partial<Record<Breakpoint, true>>,
): string[] {
  const accepted = STYLE_KEYS_BY_TYPE[type] as readonly string[];
  const out: string[] = [];
  for (const bp of BREAKPOINTS) {
    const layer: unknown = style?.[bp];
    if (!isRecord(layer)) continue;
    for (const key of Object.keys(layer)) {
      if (!accepted.includes(key)) continue;
      const value = layer[key];
      if (key === 'bg') {
        const bg = bgClass(value);
        if (bg) out.push(`${PREFIX[bp]}${bg}`);
        continue;
      }
      if (!STYLE_VALUES[key as StyleKey].includes(value as never)) continue;
      out.push(`${PREFIX[bp]}${STEM[key as Exclude<StyleKey, 'bg'>]}-${typeof value === 'boolean' ? Number(value) : String(value).replace(':', '-')}`);
    }
  }
  for (const bp of BREAKPOINTS) if (hidden?.[bp] === true) out.push(HIDE[bp]);
  return out;
}

/** CSS-module class names for the element, ready for `className`. */
export const styleClassNames = (type: ElementType, style: ResponsiveStyle | undefined, hidden?: Partial<Record<Breakpoint, true>>): string[] =>
  styleClassKeys(type, style, hidden).flatMap((k) => styles[k] ?? []);
