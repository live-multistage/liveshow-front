'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { RotateCcw } from 'lucide-react';
import {
  COLOR_KEYS, GRADIENT_KEYS, TYPO_KEYS, type Breakpoint, type ColorKey, type GradientKey, type PageBackground, type StyleKey, type TypoKey,
} from '@live-show/api-contracts';
import { ImageUpload } from '../../components/InspectorFields';
import { inheritedFrom, ownsKey } from './inspector-model';
import styles from './ElementInspector.module.scss';

type Props = Record<string, unknown>;

/** What a style control needs to know about the element it edits at the current breakpoint. */
export interface StyleCtx {
  bp: Breakpoint;
  props: Props;
  /** Effective style at `bp` (inheritance already applied). */
  values: Record<string, unknown>;
  set(key: StyleKey, value: unknown): void;
  reset(key: StyleKey): void;
}

/** Label row of a style control: on tablet/mobile it says whether the value is the element's own or inherited. */
export function StyleField({ ctx, k, label, children }: { ctx: StyleCtx; k: StyleKey; label: string; children: ReactNode }) {
  const t = useTranslations('platformAdmin.pageEditorV2.inspector.style');
  const own = ownsKey(ctx.props, ctx.bp, k);
  return (
    <div className={styles.field}>
      <div className={styles.flabel}>
        <span>{label}</span>
        {ctx.bp !== 'desktop' && (own ? (
          <span className={styles.override}>
            <span className={styles.dot} data-testid={`override-${k}`} title={t('overridden', { bp: t(`bp.${ctx.bp}`) })} />
            <button type="button" className={styles.reset} aria-label={t('resetField', { field: label })} onClick={() => ctx.reset(k)}>
              <RotateCcw aria-hidden="true" />{t('reset')}
            </button>
          </span>
        ) : (
          <span className={styles.inherits}>{t('inherits', { from: t(`bp.${inheritedFrom(ctx.props, ctx.bp, k)}`) })}</span>
        ))}
      </div>
      {children}
    </div>
  );
}

export interface ChoiceOption<T extends string | number> {
  value: T;
  label: ReactNode;
  title?: string;
  /** Overrides the screen reader name (defaults to the label when it is text). */
  ariaLabel?: string;
}

/** Segmented control (pressed button = current value). `scale` lays the options out as an even grid (spacing, radius). */
export function Choice<T extends string | number>({ label, value, options, onSelect, scale }: {
  label: string; value: T | undefined; options: readonly ChoiceOption<T>[]; onSelect(value: T): void; scale?: boolean;
}) {
  return (
    <div className={scale ? styles.scale : styles.seg} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={String(option.value)} type="button" aria-pressed={option.value === value} title={option.title}
          aria-label={option.ariaLabel} className={option.value === value ? styles.on : undefined} onClick={() => onSelect(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Spacing / radius tokens: the document stores the key, the button shows its size. */
export const TokenScale = Choice;

const COLOR_ORDER: readonly ColorKey[] = COLOR_KEYS;

/**
 * Palette swatches. `color` mode edits a `ColorKey`; `background` mode edits a `PageBackground`: palette color, one of the
 * three gradients, or an uploaded image (the renderer adds the scrim; the document only stores `scrim: 'default'`).
 */
export function TokenSwatches(props: { label: string; mode: 'color'; value: ColorKey | undefined; onChange(value: ColorKey): void }
  | { label: string; mode: 'background'; value: PageBackground | undefined; onChange(value: PageBackground): void }) {
  const t = useTranslations('platformAdmin.pageEditorV2.inspector.style');
  const background = props.mode === 'background' ? props.value : undefined;
  const current = props.mode === 'color' ? props.value : background?.kind === 'color' ? background.token : undefined;
  const gradient = background?.kind === 'gradient' ? background.token : undefined;
  const pick = (kind: 'color' | 'gradient', token: string) => {
    if (props.mode === 'color') return props.onChange(token as ColorKey);
    props.onChange({ kind, token } as PageBackground);
  };
  const name = gradient ? t(`gradient.${gradient}`) : background?.kind === 'image' ? t('imageBackground') : current ? t(`color.${current}`) : '—';
  return (
    <div className={styles.swatches}>
      <div className={styles.sw} role="group" aria-label={props.label}>
        {COLOR_ORDER.map((token) => (
          <button key={token} type="button" aria-pressed={token === current} data-swatch={token} title={t(`color.${token}`)} aria-label={t(`color.${token}`)}
            className={`${styles.swatch} ${styles[`sw-${token}`]} ${token === current ? styles.on : ''}`} onClick={() => pick('color', token)} />
        ))}
        {props.mode === 'background' && (GRADIENT_KEYS as readonly GradientKey[]).map((token) => (
          <button key={token} type="button" aria-pressed={token === gradient} data-swatch={token} title={t(`gradient.${token}`)} aria-label={t(`gradient.${token}`)}
            className={`${styles.swatch} ${styles[`gr-${token}`]} ${token === gradient ? styles.on : ''}`} onClick={() => pick('gradient', token)} />
        ))}
      </div>
      <span className={styles.swatchName}>{name}</span>
      {props.mode === 'background' && (
        <>
          <ImageUpload onUploaded={(url) => props.onChange({ kind: 'image', url, scrim: 'default' })} />
          <span className={styles.hint}>{t('imageHint')}</span>
        </>
      )}
    </div>
  );
}

// Display sizes of the presets per breakpoint (mirrors the `$typo` tokens in styles/_variables.scss).
const TYPO_SIZES: Record<TypoKey, readonly [number, number, number]> = {
  hero: [52, 40, 34], display: [34, 30, 28], xxl: [28, 24, 22], xl: [22, 20, 18], lg: [18, 18, 16], md: [16, 16, 15], sm: [14, 14, 14], label: [11, 11, 10],
};
const BP_INDEX: Record<Breakpoint, 0 | 1 | 2> = { desktop: 0, tablet: 1, mobile: 2 };

export function TypographyPresets({ label, bp, value, onSelect }: { label: string; bp: Breakpoint; value: TypoKey | undefined; onSelect(value: TypoKey): void }) {
  const t = useTranslations('platformAdmin.pageEditorV2.inspector.style');
  return (
    <div className={styles.presets} role="group" aria-label={label}>
      {TYPO_KEYS.map((key) => (
        <button key={key} type="button" aria-pressed={key === value} className={key === value ? styles.on : undefined} onClick={() => onSelect(key)}>
          <span className={styles[`ty-${key}`]}>{t(`typo.${key}`)}</span>
          <small>{TYPO_SIZES[key][BP_INDEX[bp]]}px</small>
        </button>
      ))}
    </div>
  );
}
