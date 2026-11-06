'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createUsePuck } from '@puckeditor/core';
import { ArrowUpLeft, Copy, Layers, Trash2 } from 'lucide-react';
import { Button } from '@live-show/design-system';
import type { ElementType } from '@live-show/api-contracts';
import { toContractId } from '../puck-data';
import { AdvancedTab } from './AdvancedTab';
import { ContentTab } from './ContentTab';
import { StyleTab } from './StyleTab';
import { useBreakpoint } from '../use-breakpoint';
import { useElementIssues } from './element-issues';
import styles from './ElementInspector.module.scss';

const usePuck = createUsePuck();

// Puck records one undo entry per `replace`; a keystroke must not be one. Edits are applied without history and the
// burst is recorded once, after a pause, on blur, or when the selection changes.
const HISTORY_PAUSE_MS = 500;

type Props = Record<string, unknown>;
type TabName = 'content' | 'style' | 'advanced';
const TABS: readonly TabName[] = ['content', 'style', 'advanced'];

const withPatch = (props: Props, patch: Props): Props =>
  Object.fromEntries(Object.entries({ ...props, ...patch }).filter(([, value]) => value !== undefined));

/** The `fields` override of Puck: edits the selected element through the Puck store, never through state of its own. */
export function ElementInspector() {
  const t = useTranslations('platformAdmin.pageEditorV2.inspector');
  const selected = usePuck((s) => s.selectedItem);
  if (!selected) {
    return (
      <div className={styles.empty} data-testid="inspector-empty">
        <Layers aria-hidden="true" />
        <b>{t('empty.title')}</b>
        <span>{t('empty.text')}</span>
      </div>
    );
  }
  const puckId = String((selected.props as Props).id);
  return <SelectedInspector key={puckId} puckId={puckId} type={selected.type as ElementType} props={selected.props as Props} />;
}

function SelectedInspector({ puckId, type, props }: { puckId: string; type: ElementType; props: Props }) {
  const t = useTranslations('platformAdmin.pageEditorV2.inspector');
  const tTypes = useTranslations('platformAdmin.pageEditorV2.types');
  const dispatch = usePuck((s) => s.dispatch);
  const getSelectorForId = usePuck((s) => s.getSelectorForId);
  const getParentById = usePuck((s) => s.getParentById);
  const [tab, setTab] = useState<TabName>('content');
  const elementId = toContractId(puckId);
  const issues = useElementIssues(elementId);

  // Uploads and quick successive edits resolve against the latest props, not the ones captured by an earlier render.
  const latest = useRef(props);
  latest.current = props;
  const selector = getSelectorForId(puckId);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const unrecorded = useRef(false);
  const replace = (next: Props, recordHistory: boolean) => {
    if (selector) dispatch({ type: 'replace', destinationIndex: selector.index, destinationZone: selector.zone, data: { type, props: next } as never, recordHistory } as never);
  };
  const flush = () => {
    clearTimeout(timer.current);
    if (!unrecorded.current) return;
    unrecorded.current = false;
    replace(latest.current, true);
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => flushRef.current(), []);
  const change = (fn: (current: Props) => Props) => {
    latest.current = fn(latest.current);
    unrecorded.current = true;
    replace(latest.current, false);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, HISTORY_PAUSE_MS);
  };
  const set = (patch: Props) => change((current) => withPatch(current, patch));
  const bp = useBreakpoint();

  const parent = getParentById(puckId);
  const parentSelector = parent ? getSelectorForId(String((parent.props as Props).id)) : undefined;

  return (
    <div className={styles.inspector} data-testid="element-inspector" data-element-id={elementId} onBlur={flush}>
      <div className={styles.head}>
        <div className={styles.title}>
          <b>{tTypes(type)}</b>
          <small>{parent ? t('insideOf', { name: tTypes(parent.type as ElementType) }) : t('inPage')}</small>
        </div>
        {issues.length > 0 && <span className={styles.pill} role="status">{t(issues.length === 1 ? 'errorsOne' : 'errorsMany', { count: issues.length })}</span>}
        {parentSelector && (
          <Button type="button" variant="ghost" size="icon" aria-label={t('actions.selectParent')} title={t('actions.selectParent')}
            onClick={() => dispatch({ type: 'setUi', ui: { itemSelector: parentSelector } })}><ArrowUpLeft aria-hidden="true" /></Button>
        )}
        <Button type="button" variant="ghost" size="icon" aria-label={t('actions.duplicate')} title={t('actions.duplicate')} disabled={!selector}
          onClick={() => selector && dispatch({ type: 'duplicate', sourceIndex: selector.index, sourceZone: selector.zone })}><Copy aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label={t('actions.delete')} title={t('actions.delete')} disabled={!selector}
          onClick={() => selector && dispatch({ type: 'remove', index: selector.index, zone: selector.zone })}><Trash2 aria-hidden="true" /></Button>
      </div>
      <div className={styles.tabs} role="tablist" aria-label={t('tabs.label')}>
        {TABS.map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} className={tab === name ? styles.on : undefined} onClick={() => setTab(name)}>
            {t(`tabs.${name}`)}
          </button>
        ))}
      </div>
      <div className={styles.body} role="tabpanel">
        {tab === 'content' && <ContentTab elementId={elementId} type={type} props={props} issues={issues} set={set} />}
        {tab === 'style' && <StyleTab type={type} props={props} bp={bp} issues={issues} change={change} />}
        {tab === 'advanced' && <AdvancedTab elementId={elementId} props={props} issues={issues} set={set} />}
      </div>
    </div>
  );
}
