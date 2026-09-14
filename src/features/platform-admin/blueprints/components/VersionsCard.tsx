'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import type { BlueprintDetail } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';
import { blueprintErrorMessage } from '../errorMessage';
import { useActivateBlueprintMutation, usePublishBlueprintVersionMutation } from '../mutations/blueprints.mutations';
import styles from './VersionsCard.module.scss';

interface Props {
  blueprint: BlueprintDetail;
  onError: (message: string) => void;
}

const STATE_CLASS: Record<'draft' | 'published' | 'active', string> = {
  draft: styles.draft, published: styles.published, active: styles.active,
};

// Design B1: one row per version — RASCUNHO/PUBLICADA/ATIVA — with the single
// next action for that state (Publicar, Ativar, or Abrir no editor when a
// draft still has analysis errors).
export function VersionsCard({ blueprint, onError }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const format = useFormatter();
  const publish = usePublishBlueprintVersionMutation();
  const activate = useActivateBlueprintMutation();
  const onErr = { onError: (err: AppError) => onError(blueprintErrorMessage(t, err.code)) };

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>{t('detail.versions')}</h2>
      <ul className={styles.list}>
        {blueprint.versions.map((v) => {
          const isActive = blueprint.activeVersionId === v.id;
          const state: 'draft' | 'published' | 'active' = isActive ? 'active' : v.publishedAt ? 'published' : 'draft';
          return (
            <li key={v.id} className={styles.row}>
              <span className={styles.version}>v{v.version}</span>
              <div className={styles.info}>
                <span className={`${styles.statePill} ${STATE_CLASS[state]}`}>{t(`detail.${state}`)}</span>
                <div className={styles.meta}>
                  {v.publishedAt ? format.dateTime(new Date(v.publishedAt), { dateStyle: 'short' }) : '—'}
                  {' · '}
                  <span className={v.analysis.ok ? styles.ok : styles.errorCount}>
                    {v.analysis.ok ? t('detail.versionNoErrors') : t('detail.versionErrorCount', { count: v.analysis.errors.length })}
                  </span>
                </div>
              </div>
              {state === 'draft' && v.analysis.ok && (
                <button className={styles.action} disabled={publish.isPending} onClick={() => publish.mutate({ id: blueprint.id, versionId: v.id }, onErr)}>
                  {t('detail.publish')}
                </button>
              )}
              {state === 'draft' && !v.analysis.ok && (
                <Link className={styles.action} href={`/dashboard/platform/blueprints/${blueprint.id}/editor?version=${v.id}`}>
                  {t('detail.openEditor')}
                </Link>
              )}
              {state === 'published' && (
                <button className={styles.action} disabled={activate.isPending} onClick={() => activate.mutate({ id: blueprint.id, versionId: v.id }, onErr)}>
                  {t('detail.activate')}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
