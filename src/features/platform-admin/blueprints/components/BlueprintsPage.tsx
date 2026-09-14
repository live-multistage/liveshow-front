'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Input, Label } from '@live-show/design-system';
import type { BlueprintStatus } from '@live-show/api-contracts';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import tableStyles from '../../components/PlatformTable.module.scss';
import { useBlueprintsQuery } from '../queries/blueprints.queries';
import { useCreateBlueprintMutation } from '../mutations/blueprints.mutations';
import styles from './BlueprintsPage.module.scss';

export const STATUS_BADGE: Record<BlueprintStatus, string> = {
  ACTIVE: tableStyles.badgeGreen, INACTIVE: tableStyles.badge, INVALID: tableStyles.badgeRed,
};

export function BlueprintsPage() {
  const t = useTranslations('platformAdmin.blueprints');
  const { data = [], isLoading, isError } = useBlueprintsQuery();
  const create = useCreateBlueprintMutation();
  const [name, setName] = useState('');

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name: name.trim(), description: '' }, { onSuccess: () => setName('') });
  }

  return (
    <PlatformPageShell group={t('group')} title={t('title')} subtitle={t('subtitle')}>
      <form className={styles.create} onSubmit={onCreate}>
        <Label htmlFor="blueprint-name">{t('name')}</Label>
        <Input id="blueprint-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={create.isPending || !name.trim()}>{t('create')}</Button>
      </form>
      {isError && <p role="alert" className={tableStyles.filterError}>{t('errors.GENERIC')}</p>}
      {!isLoading && data.length === 0 ? (
        <p className={tableStyles.empty}>{t('empty')}</p>
      ) : (
        <div className={tableStyles.scroll}>
          <table className={tableStyles.card}>
            <thead className={tableStyles.head}>
              <tr>
                {(['name', 'status', 'version', 'started', 'completed', 'cancelled', 'failed'] as const).map((c) => <th key={c}>{t(`columns.${c}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((b) => (
                <tr key={b.id} className={tableStyles.row}>
                  <td><Link className={tableStyles.primaryLink} href={`/dashboard/platform/blueprints/${b.id}`}>{b.name}</Link></td>
                  <td><span className={STATUS_BADGE[b.status]}>{t(`status.${b.status}`)}</span></td>
                  <td className={tableStyles.mono}>{b.latestVersion ? `v${b.latestVersion}` : '—'}</td>
                  <td className={tableStyles.mono}>{b.counts7d.started}</td>
                  <td className={tableStyles.mono}>{b.counts7d.completed}</td>
                  <td className={tableStyles.mono}>{b.counts7d.cancelled}</td>
                  <td className={tableStyles.mono}>{b.counts7d.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PlatformPageShell>
  );
}
