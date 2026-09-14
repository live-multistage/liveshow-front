'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { BlueprintAnalysisError } from '@live-show/api-contracts';
import styles from './EditorPage.module.scss';

interface Props {
  errors: BlueprintAnalysisError[];
  open: boolean;
  onToggle(): void;
  onSelectNode(nodeId: string): void;
}

// Collapsible "PROBLEMAS (n)" bar (design C2). A node-scoped error selects
// and centers its node; graph-level errors (NO_TRIGGER, CYCLE…) just list.
export function ProblemsFooter({ errors, open, onToggle, onSelectNode }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  if (errors.length === 0) return null;
  const title = (code: string) => (t.has(`errors.${code}`) ? t(`errors.${code}`) : t('errors.GENERIC'));

  return (
    <footer className={styles.problems}>
      <button type="button" className={styles.problemsHead} aria-expanded={open} onClick={onToggle}>
        {t('editor.problems', { count: errors.length })}
        {open ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />}
      </button>
      {open && (
        <ul className={styles.problemList}>
          {errors.map((e, i) => (
            <li key={i}>
              <button type="button" className={styles.problem} disabled={!e.nodeId} title={e.message} onClick={() => e.nodeId && onSelectNode(e.nodeId)}>
                <span className={styles.problemNode}>{e.nodeId ?? '—'}</span>
                <span className={styles.problemTitle}>{title(e.code)}</span>
                {e.nodeId && <span className={styles.problemLink}>{t('editor.viewNode')}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </footer>
  );
}
