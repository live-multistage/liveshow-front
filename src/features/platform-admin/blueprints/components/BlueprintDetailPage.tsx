'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Label } from '@live-show/design-system';
import type { BlueprintGraph, BlueprintVersionDto } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';
import { PlatformPageShell } from '../../components/PlatformPageShell';
import tableStyles from '../../components/PlatformTable.module.scss';
import { useBlueprintQuery, useBlueprintRunsQuery } from '../queries/blueprints.queries';
import {
  useActivateBlueprintMutation, useDeactivateBlueprintMutation, usePublishBlueprintVersionMutation, useSaveBlueprintVersionMutation,
} from '../mutations/blueprints.mutations';
import { STATUS_BADGE } from './BlueprintsPage';
import styles from './BlueprintDetailPage.module.scss';

export function BlueprintDetailPage({ id }: { id: string }) {
  const t = useTranslations('platformAdmin.blueprints');
  const { data } = useBlueprintQuery(id);
  const { data: runs } = useBlueprintRunsQuery(id);
  const save = useSaveBlueprintVersionMutation();
  const publish = usePublishBlueprintVersionMutation();
  const activate = useActivateBlueprintMutation();
  const deactivate = useDeactivateBlueprintMutation();
  const [json, setJson] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const onError = { onError: (err: AppError) => setMessage(t(`errors.${err.code ?? 'GENERIC'}`)) };

  if (!data) return null;
  const latest: BlueprintVersionDto | undefined = data.versions[0];

  function onSave() {
    let graph: BlueprintGraph;
    try {
      graph = JSON.parse(json) as BlueprintGraph;
    } catch {
      setMessage(t('detail.invalidJson'));
      return;
    }
    setMessage(null);
    save.mutate({ id, graph }, onError);
  }

  async function onExport() {
    if (!latest) return;
    await navigator.clipboard.writeText(JSON.stringify(latest.graph, null, 2));
    setMessage(t('detail.copied'));
  }

  return (
    <PlatformPageShell
      group={t('group')}
      title={data.name}
      subtitle={t(`status.${data.status}`)}
      actions={data.status === 'ACTIVE'
        ? <Button variant="outline" onClick={() => deactivate.mutate({ id }, onError)}>{t('detail.deactivate')}</Button>
        : null}
    >
      <Link className={tableStyles.primaryLink} href="/dashboard/platform/blueprints">{t('back')}</Link>

      <section className={styles.section}>
        <Label htmlFor="blueprint-json">{t('detail.importTitle')}</Label>
        <p className={styles.hint}>{t('detail.importHint')}</p>
        <textarea id="blueprint-json" className={styles.json} value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} rows={14} />
        <div className={styles.row}>
          <Button onClick={onSave} disabled={save.isPending || !json.trim()}>{t('detail.save')}</Button>
          {latest && <Button variant="outline" onClick={onExport}>{t('detail.export')}</Button>}
        </div>
        {message && <p role="alert" className={styles.message}>{message}</p>}
      </section>

      {latest && (
        <section className={styles.section}>
          <h2 className={styles.h2}>{t('detail.analysisErrors')} — v{latest.version}</h2>
          {latest.analysis.ok ? <p className={styles.ok}>{t('detail.analysisOk')}</p> : (
            <ul className={styles.errors}>
              {latest.analysis.errors.map((e, i) => (
                <li key={`${e.nodeId ?? 'graph'}-${i}`}>
                  <span className={tableStyles.mono}>{e.nodeId ?? '—'}</span>{' '}
                  <strong>{t(`errors.${e.code}`)}</strong>{' '}
                  <span className={styles.detail}>{e.message}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('detail.versions')}</h2>
        <table className={tableStyles.card}>
          <tbody>
            {data.versions.map((v) => {
              const isActive = data.activeVersionId === v.id;
              return (
                <tr key={v.id} className={tableStyles.row}>
                  <td className={tableStyles.mono}>v{v.version}</td>
                  <td>{isActive ? t('detail.active') : v.publishedAt ? t('detail.published') : t('detail.draft')}</td>
                  <td className={tableStyles.right}>
                    {!v.publishedAt && v.analysis.ok && (
                      <Button size="sm" onClick={() => publish.mutate({ id, versionId: v.id }, onError)}>{t('detail.publish')}</Button>
                    )}
                    {v.publishedAt && !isActive && (
                      <Button size="sm" onClick={() => activate.mutate({ id, versionId: v.id }, onError)}>{t('detail.activate')}</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('detail.runs')}</h2>
        {!runs || runs.items.length === 0 ? <p className={tableStyles.empty}>{t('detail.noRuns')}</p> : (
          <table className={tableStyles.card}>
            <thead className={tableStyles.head}>
              <tr>{(['status', 'node', 'wakeAt', 'error', 'created'] as const).map((c) => <th key={c}>{t(`runColumns.${c}`)}</th>)}</tr>
            </thead>
            <tbody>
              {runs.items.map((r) => (
                <tr key={r.id} className={tableStyles.row}>
                  <td>{t(`runStatus.${r.status}`)}</td>
                  <td className={tableStyles.mono}>{r.currentNodeId ?? '—'}</td>
                  <td className={tableStyles.mono}>{r.wakeAt ? new Date(r.wakeAt).toLocaleString() : '—'}</td>
                  <td className={tableStyles.mono}>{r.errorCode ?? '—'}</td>
                  <td className={tableStyles.mono}>{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </PlatformPageShell>
  );
}
