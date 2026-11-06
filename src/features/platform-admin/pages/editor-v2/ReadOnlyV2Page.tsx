'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@live-show/design-system';
import type { PageDetail, PageDocumentV2 } from '@live-show/api-contracts';
import { PageRoot, elementResolved } from '@/features/pages-public/elements';
import { usePagePreviewQuery } from '../queries/use-pages';
import { PAGES_LIST_HREF } from '../components/EditorTopbar';
import shell from '../components/PageEditor.module.scss';
import styles from './PageEditorV2.module.scss';

/** The v1 editor cannot open a v2 draft: say so and show a read-only preview of it. */
export function ReadOnlyV2Page({ page }: { page: PageDetail }) {
  const t = useTranslations('platformAdmin.pageEditorV2.readOnly');
  const preview = usePagePreviewQuery(page.id, page.draftRevision);
  const document = page.draft as PageDocumentV2;
  const resolved = preview.data ? elementResolved(document, preview.data.resolved) : { rails: {}, featured: {} };
  return (
    <>
      <div className={shell.state} data-testid="v2-read-only">
        <h1 className={shell.stateTitle}>{t('title')}</h1>
        <p className={shell.stateText}>{t('text')}</p>
        <Button asChild><Link href={PAGES_LIST_HREF}>{t('back')}</Link></Button>
      </div>
      <div className={styles.readOnlyPage}>
        <PageRoot document={document} ctx={{ resolved, mode: 'editor' }} />
      </div>
    </>
  );
}
