'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { LegalDocumentKind } from '@live-show/api-contracts';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@live-show/design-system';
import { useLegalVersionsQuery } from '../queries/use-legal-admin';
import { formatLegalDate, versionUrl } from '../utils/legal-doc';
import styles from './LegalHistoryDrawer.module.scss';

interface Props {
  kind: LegalDocumentKind | null;
  onClose: () => void;
}

export function LegalHistoryDrawer({ kind, onClose }: Props) {
  return (
    <Dialog open={kind !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.drawer}>{kind && <HistoryBody kind={kind} />}</DialogContent>
    </Dialog>
  );
}

function HistoryBody({ kind }: { kind: LegalDocumentKind }) {
  const t = useTranslations('platformAdmin.legal');
  const locale = useLocale();
  const { data, isError } = useLegalVersionsQuery(kind);
  const versions = [...(data ?? [])].sort((a, b) => b.version - a.version);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.eyebrow}>{t(`docs.${kind}`)}</div>
        <DialogTitle className={styles.title}>{t('historyDrawer.title')}</DialogTitle>
        <DialogDescription className={styles.srOnly}>{t(`docs.${kind}`)}</DialogDescription>
      </header>
      <ol className={styles.list}>
        {isError && <li className={styles.note}>{t('historyDrawer.loadError')}</li>}
        {versions.map((v, index) => (
          <li key={v.version} className={styles.item}>
            <span className={index === 0 ? `${styles.dot} ${styles.dotCurrent}` : styles.dot} />
            <div className={styles.itemBody}>
              <div className={styles.itemHead}>
                <span className={styles.version}>{t('versionBadge', { n: v.version })}</span>
                {index === 0 && <span className={styles.current}>{t('historyDrawer.current')}</span>}
                <a className={styles.open} href={versionUrl(kind, v.version)} target="_blank" rel="noopener noreferrer">
                  {t('historyDrawer.open')} ↗
                </a>
              </div>
              <div className={styles.date}>{formatLegalDate(v.publishedAt, locale, true)}</div>
              <div className={styles.summary}>{v.changeSummary}</div>
            </div>
          </li>
        ))}
        {versions.length === 1 && <li className={styles.note}>{t('historyDrawer.single')}</li>}
      </ol>
    </>
  );
}
