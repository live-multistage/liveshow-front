'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Monitor } from 'lucide-react';
import { Button, Skeleton } from '@live-show/design-system';
import { useMediaQuery } from '../hooks/use-media-query';
import { usePageQuery } from '../queries/use-pages';
import { PAGES_LIST_HREF } from './EditorTopbar';
import { PageEditor } from './PageEditor';
import styles from './PageEditor.module.scss';

const UNSUPPORTED_QUERY = '(max-width: 820px)';

const isNotFound = (error: unknown) => (error as { response?: { status?: number } } | null)?.response?.status === 404;

export function PageEditorPage({ pageId }: { pageId: string }) {
  const t = useTranslations('platformAdmin.pageEditor');
  const unsupported = useMediaQuery(UNSUPPORTED_QUERY);
  const { data: page, isError, error, refetch } = usePageQuery(unsupported ? null : pageId);
  const [reloadToken, setReloadToken] = useState(0);
  const [reloadFailed, setReloadFailed] = useState(false);

  if (unsupported) {
    return (
      <StatePanel title={t('unsupported.title')} text={t('unsupported.text')} icon={<Monitor aria-hidden="true" />}>
        <Button asChild><Link href={PAGES_LIST_HREF}>{t('unsupported.back')}</Link></Button>
      </StatePanel>
    );
  }
  if (isError && isNotFound(error)) {
    return (
      <StatePanel title={t('notFound.title')} text={t('notFound.text')}>
        <Button asChild><Link href={PAGES_LIST_HREF}>{t('notFound.back')}</Link></Button>
      </StatePanel>
    );
  }
  if (isError) {
    return (
      <StatePanel title={t('loadError.title')}>
        <Button type="button" onClick={() => void refetch()}>{t('loadError.retry')}</Button>
      </StatePanel>
    );
  }
  if (!page) return <EditorSkeleton />;

  return (
    <PageEditor
      key={`${page.id}:${reloadToken}`}
      page={page}
      reloadFailed={reloadFailed}
      onReload={() => {
        setReloadFailed(false);
        // Remount only with fresh data: a failed refetch would restart the editor on the stale page and revision.
        void refetch().then((result) => {
          if (result?.isError || !result?.data) return setReloadFailed(true);
          setReloadToken((n) => n + 1);
        }, () => setReloadFailed(true));
      }}
    />
  );
}

function StatePanel({ title, text, icon, children }: { title: string; text?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={styles.state}>
      {icon && <span className={styles.stateIcon}>{icon}</span>}
      <h1 className={styles.stateTitle}>{title}</h1>
      {text && <p className={styles.stateText}>{text}</p>}
      {children}
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className={styles.editor} data-testid="editor-skeleton" aria-busy="true">
      <div className={styles.topbar}><Skeleton className={styles.skelTitle} /></div>
      <div className={`${styles.body} ${styles.withInspector}`}>
        <div className={`${styles.column} ${styles.left} ${styles.skelColumn}`}>
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className={styles.skelRow} />)}
        </div>
        <div className={`${styles.column} ${styles.skelColumn}`}>
          <Skeleton className={styles.skelHero} />
        </div>
        <div className={`${styles.column} ${styles.right} ${styles.skelColumn}`}>
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className={styles.skelField} />)}
        </div>
      </div>
    </div>
  );
}
