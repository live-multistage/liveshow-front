'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@live-show/design-system';
import {
  ALIGN_KEYS, ASPECT_KEYS, BORDER_KEYS, BUTTON_SIZES, BUTTON_VARIANTS, COLS_KEYS, MAXW_KEYS, MINH_KEYS, RADIUS_KEYS, RATIO_KEYS, SHADOW_KEYS,
  SPACE_KEYS, VALIGN_KEYS, WIDTH_KEYS, type Breakpoint, type ElementType, type StyleKey,
} from '@live-show/api-contracts';
import { issueFor } from '../../components/InspectorFields';
import { Choice, StyleField, TokenScale, TokenSwatches, TypographyPresets, type ChoiceOption, type StyleCtx } from './controls';
import { effectiveStyle, styleKeyGroups, withoutStyleKey, withStyleValue, type ElementIssue } from './inspector-model';
import styles from './ElementInspector.module.scss';

type Props = Record<string, unknown>;

const SPACE_PX: Record<(typeof SPACE_KEYS)[number], number> = { '0': 0, xs: 4, sm: 8, md: 12, xl: 24, lg: 16, xxl: 32, xxxl: 48, l1: 64, l2: 96, l3: 128 };
const RADIUS_PX: Record<(typeof RADIUS_KEYS)[number], number> = { none: 0, sm: 6, md: 10, lg: 16, full: 999 };
const SPACE_KEYS_OF_STYLE: readonly StyleKey[] = ['p', 'pt', 'pb', 'pl', 'pr', 'gap', 'my', 'h'];
// Enumerated keys drawn as a segmented control, with the values the contract accepts.
const ENUMS: Partial<Record<StyleKey, readonly string[]>> = {
  align: ALIGN_KEYS, halign: ALIGN_KEYS, valign: VALIGN_KEYS, maxw: MAXW_KEYS, width: WIDTH_KEYS, minh: MINH_KEYS, border: BORDER_KEYS,
  shadow: SHADOW_KEYS, variant: BUTTON_VARIANTS, size: BUTTON_SIZES, aspect: ASPECT_KEYS,
};
// Keys whose absence means something ("auto"): only the base can go back to it, tablet/mobile use "back to inherited".
const HAS_AUTO: readonly StyleKey[] = ['maxw', 'minh'];
const AUTO = '__auto';
const DEFAULT_COLS = (bp: Breakpoint) => (bp === 'mobile' ? 1 : 2);

function StyleControl({ k, ctx }: { k: StyleKey; ctx: StyleCtx }) {
  const t = useTranslations('platformAdmin.pageEditorV2.inspector.style');
  const label = t(`key.${k}`);
  const value = ctx.values[k];
  const field = (children: React.ReactNode) => <StyleField ctx={ctx} k={k} label={label}>{children}</StyleField>;

  if (k === 'typo') return field(<TypographyPresets label={label} bp={ctx.bp} value={value as never} onSelect={(v) => ctx.set(k, v)} />);
  if (k === 'color') return field(<TokenSwatches label={label} mode="color" value={value as never} onChange={(v) => ctx.set(k, v)} />);
  if (k === 'bg') return field(<TokenSwatches label={label} mode="background" value={value as never} onChange={(v) => ctx.set(k, v)} />);
  if (k === 'full') {
    return field(<Switch aria-label={label} checked={value === true} onCheckedChange={(on) => ctx.set(k, on)} />);
  }
  if (SPACE_KEYS_OF_STYLE.includes(k)) {
    const options = SPACE_KEYS.map((key): ChoiceOption<string> => ({ value: key, label: SPACE_PX[key], title: `${SPACE_PX[key]}px`, ariaLabel: `${SPACE_PX[key]}px` }));
    return field(<TokenScale scale label={label} value={value as string | undefined} options={options} onSelect={(v) => ctx.set(k, v)} />);
  }
  if (k === 'radius') {
    const options = RADIUS_KEYS.map((key): ChoiceOption<string> => ({ value: key, label: key === 'full' ? '●' : RADIUS_PX[key], title: `${RADIUS_PX[key]}px`, ariaLabel: `${RADIUS_PX[key]}px` }));
    return field(<TokenScale scale label={label} value={value as string | undefined} options={options} onSelect={(v) => ctx.set(k, v)} />);
  }
  if (k === 'cols') {
    const options = COLS_KEYS.map((n): ChoiceOption<number> => ({ value: n, label: String(n) }));
    return field(<Choice label={label} value={(value as number | undefined) ?? DEFAULT_COLS(ctx.bp)} options={options} onSelect={(v) => ctx.set(k, v)} />);
  }
  if (k === 'ratio') {
    const cols = (ctx.values.cols as number | undefined) ?? DEFAULT_COLS(ctx.bp);
    const ratios = RATIO_KEYS.filter((ratio) => ratio.split('-').length === cols);
    if (cols === 1 || ratios.length === 0) return null;
    return field(<Choice label={label} value={value as string | undefined} options={ratios.map((r) => ({ value: r, label: r.replaceAll('-', ':') }))} onSelect={(v) => ctx.set(k, v)} />);
  }
  const values = ENUMS[k];
  if (!values) return null;
  const options: ChoiceOption<string>[] = values.map((v) => ({ value: v, label: k === 'aspect' ? v : t(`opt.${k}.${v}`) }));
  const withAuto = HAS_AUTO.includes(k) && ctx.bp === 'desktop';
  if (withAuto) options.unshift({ value: AUTO, label: t(k === 'maxw' ? 'total' : 'auto') });
  return field(
    <Choice label={label} value={withAuto && value === undefined ? AUTO : (value as string | undefined)} options={options}
      onSelect={(v) => (v === AUTO ? ctx.reset(k) : ctx.set(k, v))} />,
  );
}

interface Tab {
  type: ElementType;
  props: Props;
  bp: Breakpoint;
  issues: ElementIssue[];
  /** Applies a change to the latest props of the element. */
  change(fn: (props: Props) => Props): void;
}

export function StyleTab({ type, props, bp, issues, change }: Tab) {
  const t = useTranslations('platformAdmin.pageEditorV2.inspector.style');
  const ctx: StyleCtx = {
    bp, props, values: effectiveStyle(props, bp),
    set: (key, value) => change((current) => withStyleValue(current, bp, key, value)),
    reset: (key) => change((current) => withoutStyleKey(current, bp, key)),
  };
  const groups = styleKeyGroups(type);
  const error = issueFor(issues, 'style')?.message;
  return (
    <>
      <div className={bp === 'desktop' ? styles.bpNote : `${styles.bpNote} ${styles.bpNoteOverride}`}>
        <span>{bp === 'desktop' ? t('baseNote') : t('editingNote', { bp: t(`bp.${bp}`) })}</span>
      </div>
      {groups.map(({ group, keys }) => (
        <section key={group} className={styles.group} aria-label={t(`group.${group}`)}>
          <span className={styles.groupTitle}>{t(`group.${group}`)}</span>
          {keys.map((key) => <StyleControl key={key} k={key} ctx={ctx} />)}
        </section>
      ))}
      {error && <p className={styles.error}>{error}</p>}
    </>
  );
}
