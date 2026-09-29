'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Check, Copy, Inbox, RefreshCw } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
  Switch,
} from '@live-show/design-system';
import type { CreatedSource, SourceKind, TrackingSource } from '@live-show/api-contracts';
import { TrackingShell } from './TrackingShell';
import {
  useCreateSourceMutation,
  useRotateSourceKeyMutation,
  useTrackingSourcesQuery,
  useUpdateSourceMutation,
} from '../queries/get-sources';
import styles from './TrackingSourcesPage.module.scss';

interface Props {
  trackingEnabled: boolean;
}

const KINDS: SourceKind[] = ['web', 'server'];

export function TrackingSourcesPage({ trackingEnabled }: Props) {
  const t = useTranslations('platformAdmin.tracking');
  const { data: sources, isLoading, isError, refetch } = useTrackingSourcesQuery();
  const createSource = useCreateSourceMutation();
  const rotateKey = useRotateSourceKeyMutation();
  const updateSource = useUpdateSourceMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<SourceKind>('web');
  const [keyShown, setKeyShown] = useState<CreatedSource | null>(null);
  const [copied, setCopied] = useState(false);
  const [disableTarget, setDisableTarget] = useState<TrackingSource | null>(null);

  const title = t('sources.title');
  const subtitle = t('sources.subtitle');
  const actions = <Button onClick={() => setCreateOpen(true)}>{t('sources.newSource')}</Button>;

  async function handleCreate() {
    if (!newName.trim()) return;
    const created = await createSource.mutateAsync({ name: newName.trim(), kind: newKind });
    setCreateOpen(false);
    setNewName('');
    setNewKind('web');
    setKeyShown(created);
    setCopied(false);
  }

  async function handleRotate(source: TrackingSource) {
    const created = await rotateKey.mutateAsync(source.id);
    setKeyShown(created);
    setCopied(false);
  }

  function toggleEnabled(source: TrackingSource, next: boolean) {
    if (!next) {
      setDisableTarget(source);
      return;
    }
    updateSource.mutate({ id: source.id, patch: { enabled: true } });
  }

  function confirmDisable() {
    if (!disableTarget) return;
    updateSource.mutate({ id: disableTarget.id, patch: { enabled: false } });
    setDisableTarget(null);
  }

  async function copyKey() {
    if (!keyShown) return;
    await navigator.clipboard.writeText(keyShown.writeKey);
    setCopied(true);
  }

  if (isLoading) {
    return (
      <TrackingShell active="sources" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
        <div className={styles.tableSkeletonWrap}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={styles.rowSkeleton} />
          ))}
        </div>
      </TrackingShell>
    );
  }

  if (isError || !sources) {
    return (
      <TrackingShell active="sources" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
        <div className={styles.stateBox}>
          <div className={styles.errorIcon}>
            <AlertCircle size={28} />
          </div>
          <p className={styles.stateTitle}>{t('sources.error')}</p>
          <Button variant="outline" onClick={() => refetch()}>
            {t('shell.retry')}
          </Button>
        </div>
      </TrackingShell>
    );
  }

  return (
    <TrackingShell active="sources" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
      {sources.length === 0 ? (
        <div className={styles.stateBox}>
          <div className={styles.emptyIcon}>
            <Inbox size={30} />
          </div>
          <p className={styles.stateTitle}>{t('sources.empty.title')}</p>
          <p className={styles.stateHint}>{t('sources.empty.body')}</p>
          <Button onClick={() => setCreateOpen(true)}>{t('sources.empty.cta')}</Button>
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.headerRow}>
            <span>{t('sources.columns.name')}</span>
            <span>{t('sources.columns.kind')}</span>
            <span>{t('sources.columns.key')}</span>
            <span>{t('sources.columns.status')}</span>
            <span className={styles.right}>{t('sources.columns.created')}</span>
          </div>
          {sources.map((s) => (
            <div key={s.id} className={styles.row}>
              <span className={s.enabled ? styles.name : `${styles.name} ${styles.muted}`}>{s.name}</span>
              <span className={styles.kindBadge}>{s.kind}</span>
              <span className={`${styles.mono} ${styles.keyCell}`}>
                {s.writeKeyPrefix ?? '—'}
                {s.kind === 'web' && (
                  <button
                    type="button"
                    className={styles.rotateButton}
                    onClick={() => handleRotate(s)}
                    aria-label={t('sources.rotate')}
                    title={t('sources.rotate')}
                  >
                    <RefreshCw size={13} />
                  </button>
                )}
              </span>
              <span className={styles.statusCell}>
                <Switch checked={s.enabled} onCheckedChange={(checked) => toggleEnabled(s, checked)} />
                <span className={s.enabled ? styles.statusActive : styles.statusDisabled}>
                  {t(s.enabled ? 'sources.status.active' : 'sources.status.disabled')}
                </span>
              </span>
              <span className={`${styles.mono} ${styles.muted} ${styles.right}`}>{s.createdAt}</span>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sources.newDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className={styles.formBody}>
            <label className={styles.label} htmlFor="source-name">
              {t('sources.newDialog.name')}
            </label>
            <Input id="source-name" value={newName} onChange={(e) => setNewName(e.target.value)} />

            <span className={styles.label}>{t('sources.newDialog.kind')}</span>
            <div className={styles.kindGrid}>
              {KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={newKind === kind ? `${styles.kindCard} ${styles.kindCardActive}` : styles.kindCard}
                  onClick={() => setNewKind(kind)}
                >
                  <div className={styles.mono}>{t(`sources.newDialog.${kind}`)}</div>
                  <div className={styles.kindHint}>{t(`sources.newDialog.${kind}Hint`)}</div>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t('sources.newDialog.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createSource.isPending}>
              {t('sources.newDialog.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={keyShown !== null} onOpenChange={(open) => !open && setKeyShown(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sources.keyShown.title')}</DialogTitle>
            <DialogDescription>{t('sources.keyShown.body')}</DialogDescription>
          </DialogHeader>
          {keyShown && (
            <div className={styles.formBody}>
              <label className={styles.label}>{t('sources.keyShown.label', { name: keyShown.name })}</label>
              <div className={styles.keyRow}>
                <span className={`${styles.mono} ${styles.keyValue}`}>{keyShown.writeKey}</span>
                <Button variant="outline" onClick={copyKey}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {t('sources.keyShown.copy')}
                </Button>
              </div>
              <div className={styles.warningBox}>
                {t('sources.keyShown.warning', { prefix: keyShown.writeKeyPrefix ?? '' })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setKeyShown(null)}>{t('sources.keyShown.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableTarget !== null} onOpenChange={(open) => !open && setDisableTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sources.disableConfirm.title', { name: disableTarget?.name ?? '' })}</DialogTitle>
            <DialogDescription>{t('sources.disableConfirm.body')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableTarget(null)}>
              {t('sources.disableConfirm.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDisable}>
              {t('sources.disableConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TrackingShell>
  );
}
