'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ExternalLink, Monitor } from 'lucide-react';
import { Button } from '@live-show/design-system';
import { upgradePageDocument, type PageDetail } from '@live-show/api-contracts';
import { PageRoot } from '@/features/pages-public/elements';
import { PAGES_LIST_HREF } from '../components/EditorTopbar';
import { usePagePreviewQuery } from '../queries/use-pages';
import shell from '../components/PageEditor.module.scss';
import styles from './PageEditorV2.module.scss';

/** Below this width the v2 editor does not open: the prototype asks for at least 1024px. */
export const PHONE_QUERY = '(max-width: 1023px)';

const NO_RESOLVED = { rails: {}, featured: {}, live: {} };

function DraftPreview({ page, onBack }: { page: PageDetail; onBack(): void }) {
  const t = useTranslations('platformAdmin.pageEditorV2.phone');
  const preview = usePagePreviewQuery(page.id, page.draftRevision);
  const document = useMemo(() => upgradePageDocument(page.draft), [page.draft]);
  return (
    <div className={styles.phonePreview} data-testid="phone-preview">
      <div className={styles.phonePreviewBar}>
        <Button type="button" variant="ghost" size="sm" onClick={onBack}><ArrowLeft aria-hidden="true" />{t('backToNotice')}</Button>
        <b>{page.title}</b>
      </div>
      <PageRoot document={document} ctx={{ resolved: preview.data?.resolved ?? NO_RESOLVED, mode: 'public' }} />
    </div>
  );
}

/** The v2 editor on a phone: not editable here, but the draft can be read. `page` is undefined while it loads. */
export function PhoneNotice({ page }: { page?: PageDetail }) {
  const t = useTranslations('platformAdmin.pageEditorV2.phone');
  const [previewing, setPreviewing] = useState(false);
  if (previewing && page) return <DraftPreview page={page} onBack={() => setPreviewing(false)} />;
  return (
    <div className={shell.state} data-testid="phone-notice">
      <span className={shell.stateIcon}><Monitor aria-hidden="true" /></span>
      <h1 className={shell.stateTitle}>{t('title')}</h1>
      <p className={shell.stateText}>{t('text')}</p>
      <Button type="button" disabled={!page} onClick={() => setPreviewing(true)}><ExternalLink aria-hidden="true" />{t('preview')}</Button>
      <Button asChild variant="outline"><Link href={PAGES_LIST_HREF}>{t('back')}</Link></Button>
    </div>
  );
}
