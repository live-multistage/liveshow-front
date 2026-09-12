'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@live-show/design-system';
import { useMailingTemplatesQuery } from '../queries/mailing.queries';
import { useArchiveMailingTemplateMutation, useDuplicateMailingTemplateMutation } from '../mutations/mailing.mutations';
import tableStyles from '../../components/PlatformTable.module.scss';
import styles from './MailingTable.module.scss';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });

export function TemplatesTab() {
  const t = useTranslations('platformAdmin.mailing');
  const { data, isLoading, isError } = useMailingTemplatesQuery();
  const duplicate = useDuplicateMailingTemplateMutation();
  const archive = useArchiveMailingTemplateMutation();
  const [pendingArchive, setPendingArchive] = useState<{ id: string; name: string } | null>(null);
  const [actionError, setActionError] = useState(false);

  if (isLoading) return <p className={tableStyles.empty}>{t('common.loading')}</p>;
  if (isError) return <p className={tableStyles.empty}>{t('common.loadError')}</p>;
  if (!data || data.length === 0) return <p className={tableStyles.empty}>{t('templates.empty')}</p>;

  const confirmArchive = () => {
    if (!pendingArchive) return;
    archive.mutate(pendingArchive.id, {
      onSuccess: () => setPendingArchive(null),
      onError: () => setActionError(true),
    });
  };

  return (
    <div className={tableStyles.card}>
      <div className={tableStyles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr className={tableStyles.head}>
              <th>{t('templates.colName')}</th>
              <th>{t('templates.colCategory')}</th>
              <th>{t('templates.colUpdated')}</th>
              <th>{t('templates.colTested')}</th>
              <th className={tableStyles.right}>{t('templates.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((template) => {
              const tested = template.lastTestedVersion === template.version;
              return (
                <tr key={template.id} className={tableStyles.row}>
                  <td>
                    <Link className={tableStyles.primary} href={`/dashboard/platform/mailing/templates/${template.id}`}>
                      {template.name}
                    </Link>
                  </td>
                  <td>
                    <span className={`${tableStyles.badge} ${styles.badge}`}>{t(`category.${template.category}`)}</span>
                  </td>
                  <td className={tableStyles.mono}>{dateFormatter.format(new Date(template.updatedAt))}</td>
                  <td>
                    <span className={tested ? styles.tested : styles.untested}>
                      {tested ? t('templates.tested') : t('templates.untested')}
                    </span>
                  </td>
                  <td>
                    <div className={tableStyles.actions}>
                      <Link className={tableStyles.actionBtn} href={`/dashboard/platform/mailing/templates/${template.id}`}>
                        {t('templates.edit')}
                      </Link>
                      <button
                        type="button"
                        className={tableStyles.actionBtn}
                        disabled={duplicate.isPending}
                        onClick={() => duplicate.mutate(template.id, { onError: () => setActionError(true) })}
                      >
                        {t('templates.duplicate')}
                      </button>
                      <button
                        type="button"
                        className={`${tableStyles.actionBtn} ${tableStyles.actionDanger}`}
                        onClick={() => setPendingArchive({ id: template.id, name: template.name })}
                      >
                        {t('templates.archive')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {actionError && <p className={tableStyles.filterError}>{t('templates.actionError')}</p>}

      <Dialog open={pendingArchive !== null} onOpenChange={(open) => !open && setPendingArchive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('templates.archiveTitle')}</DialogTitle>
            <DialogDescription>{t('templates.archiveBody', { name: pendingArchive?.name ?? '' })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingArchive(null)}>{t('common.cancel')}</Button>
            <Button onClick={confirmArchive} disabled={archive.isPending}>{t('common.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
