'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './PreviewPane.module.scss';

interface Props {
  html: string | null;
  /** Rendered subject ({{nome}} already substituted), shown as an inbox line. */
  subject?: string | null;
  invalid: boolean;
  failed: boolean;
}

export function PreviewPane({ html, subject, invalid, failed }: Props) {
  const t = useTranslations('platformAdmin.mailing');
  const headingId = useId();
  const [width, setWidth] = useState<600 | 375>(600);

  return (
    <section className={styles.pane} aria-labelledby={headingId}>
      <div className={styles.head}>
        <h2 id={headingId} className={styles.title}>{t('editor.preview')}</h2>
        <div className={styles.toolbar} role="group" aria-labelledby={headingId}>
          {([600, 375] as const).map((w) => (
            <button key={w} type="button" className={styles.toggle} aria-pressed={width === w} onClick={() => setWidth(w)}>
              {t(w === 600 ? 'editor.previewDesktop' : 'editor.previewMobile')}
            </button>
          ))}
        </div>
      </div>

      {subject && (
        <p className={styles.subject}>
          <span className={styles.subjectLabel}>{t('editor.subject')}</span>
          <span className={styles.subjectText}>{subject}</span>
        </p>
      )}
      {invalid && <p className={styles.notice}>{t('editor.previewInvalid')}</p>}
      {failed && <p role="alert" className={`${styles.notice} ${styles.error}`}>{t('editor.previewError')}</p>}

      <div className={styles.stage}>
        {/* sandbox="" = every restriction: no scripts, no same-origin, no navigation (spec §4). */}
        <iframe
          title={t('editor.previewTitle')}
          sandbox=""
          srcDoc={html ?? ''}
          className={`${styles.frame} ${width === 600 ? styles.desktop : styles.mobile}`}
        />
      </div>
    </section>
  );
}
