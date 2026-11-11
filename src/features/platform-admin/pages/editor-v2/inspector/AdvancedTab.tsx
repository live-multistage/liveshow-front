'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@live-show/design-system';
import { BREAKPOINTS, PAGE_V2_LIMITS as L, type Breakpoint } from '@live-show/api-contracts';
import { TextField, issueFor } from '../../components/InspectorFields';
import type { ElementIssue } from './inspector-model';
import styles from './ElementInspector.module.scss';

type Props = Record<string, unknown>;

interface Tab {
  elementId: string;
  props: Props;
  issues: ElementIssue[];
  set(patch: Props): void;
}

const optional = (value: string): string | undefined => (value === '' ? undefined : value);

export function AdvancedTab({ elementId, props, issues, set }: Tab) {
  const t = useTranslations('platformAdmin.pageEditorV2.inspector.advanced');
  const tBp = useTranslations('platformAdmin.pageEditorV2.inspector.style.bp');
  const hidden = (props.hidden ?? {}) as Partial<Record<Breakpoint, true>>;
  const anchor = typeof props.anchor === 'string' ? props.anchor : '';
  const setVisible = (bp: Breakpoint, visible: boolean) => {
    const { [bp]: _bp, ...others } = hidden;
    const next = visible ? others : { ...others, [bp]: true as const };
    set({ hidden: Object.keys(next).length > 0 ? next : undefined });
  };
  return (
    <>
      <div className={styles.field}>
        <span className={styles.flabel}>{t('visibility')}</span>
        {BREAKPOINTS.map((bp) => (
          <div key={bp} className={styles.switchRow}>
            <span id={`${elementId}-vis-${bp}`}>{t('visibleOn', { bp: tBp(bp) })}</span>
            <Switch aria-labelledby={`${elementId}-vis-${bp}`} checked={!hidden[bp]} onCheckedChange={(visible) => setVisible(bp, visible)} />
          </div>
        ))}
      </div>
      <TextField id={`${elementId}-anchor`} label={t('anchor')} value={anchor} error={issueFor(issues, 'anchor')?.message}
        onChange={(value) => set({ anchor: optional(value) })} />
      <p className={styles.hint}>{t('anchorHint', { anchor: anchor || 'programacao' })}</p>
      <TextField id={`${elementId}-name`} label={t('layerName')} max={L.nameMax} value={typeof props.name === 'string' ? props.name : ''}
        error={issueFor(issues, 'name')?.message} onChange={(value) => set({ name: optional(value) })} />
      <div className={styles.field}>
        <span className={styles.flabel}>{t('elementId')}</span>
        <span className={styles.idLine}>{elementId}</span>
        <span className={styles.hint}>{t('elementIdHint')}</span>
      </div>
    </>
  );
}
