'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import {
  Button,
  Chip,
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
import type { DeliveryStatus, TrackingDestination } from '@live-show/api-contracts';
import { TrackingShell } from './TrackingShell';
import {
  useCreateDestinationMutation,
  useDestinationDeliveriesQuery,
  useDestinationsQuery,
  useTestDestinationMutation,
  useUpdateDestinationMutation,
} from '../queries/get-destinations';
import styles from './TrackingDestinationsPage.module.scss';

interface Props {
  trackingEnabled: boolean;
}

const DELIVERY_FILTERS: (DeliveryStatus | 'all')[] = ['all', 'pending', 'delivered', 'failed'];

// ponytail: no resend-delivery hook exists yet (only test-send + list), so
// the deliveries log is read-only — no drawer/resend action was built. Add
// once a resend mutation ships.
function DeliveriesLog({ destination }: { destination: TrackingDestination }) {
  const t = useTranslations('platformAdmin.tracking.destinations');
  const [limit, setLimit] = useState(50);
  const [filter, setFilter] = useState<DeliveryStatus | 'all'>('all');
  const { data, refetch } = useDestinationDeliveriesQuery(destination.id, limit);
  const deliveries = (data ?? []).filter((d) => filter === 'all' || d.status === filter);

  return (
    <div className={styles.deliveriesPanel}>
      <div className={styles.chipsRow}>
        {DELIVERY_FILTERS.map((f) => (
          <Chip key={f} variant={filter === f ? 'active' : 'default'} onClick={() => setFilter(f)}>
            {t(`deliveryChips.${f}`)}
          </Chip>
        ))}
      </div>
      <div className={styles.deliveriesTable}>
        <div className={styles.deliveryHeaderRow}>
          <span>{t('deliveryColumns.status')}</span>
          <span>{t('deliveryColumns.attempts')}</span>
          <span>{t('deliveryColumns.lastError')}</span>
          <span className={styles.right}>{t('deliveryColumns.messages')}</span>
          <span className={styles.right}>{t('deliveryColumns.created')}</span>
        </div>
        {deliveries.map((d) => (
          <div key={d.id} className={styles.deliveryRow}>
            <span className={`${styles.deliveryPill} ${styles[`delivery-${d.status}`]}`}>{t(`deliveryStatus.${d.status}`)}</span>
            <span className={styles.mono}>{d.attempts}</span>
            <span className={`${styles.mono} ${styles.deliveryError}`} title={d.lastError ?? ''}>
              {d.lastError ?? '—'}
            </span>
            <span className={`${styles.mono} ${styles.right}`}>{d.messageCount}</span>
            <span className={`${styles.mono} ${styles.muted} ${styles.right}`}>{d.createdAt}</span>
          </div>
        ))}
      </div>
      <div className={styles.loadMoreRow}>
        <button
          type="button"
          className={styles.loadMoreLink}
          onClick={() => {
            setLimit((l) => l + 50);
            refetch();
          }}
        >
          {t('loadMore')}
        </button>
      </div>
    </div>
  );
}

export function TrackingDestinationsPage({ trackingEnabled }: Props) {
  const t = useTranslations('platformAdmin.tracking');
  const { data: destinations, isLoading, isError, refetch } = useDestinationsQuery();
  const createDestination = useCreateDestinationMutation();
  const updateDestination = useUpdateDestinationMutation();
  const testDestination = useTestDestinationMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newFilter, setNewFilter] = useState('');
  const [secretShown, setSecretShown] = useState<(TrackingDestination & { secret: string }) | null>(null);
  const [disableTarget, setDisableTarget] = useState<TrackingDestination | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; status: number | null; error: string | null } | null>(null);

  const title = t('destinations.title');
  const subtitle = t('destinations.subtitle');
  const actions = <Button onClick={() => setCreateOpen(true)}>{t('destinations.newDestination')}</Button>;

  async function handleCreate() {
    if (!newName.trim() || !newUrl.trim()) return;
    const eventFilter = newFilter
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const created = await createDestination.mutateAsync({ name: newName.trim(), url: newUrl.trim(), eventFilter });
    setCreateOpen(false);
    setNewName('');
    setNewUrl('');
    setNewFilter('');
    setSecretShown(created);
  }

  function toggleEnabled(destination: TrackingDestination, next: boolean) {
    if (!next) {
      setDisableTarget(destination);
      return;
    }
    updateDestination.mutate({ id: destination.id, patch: { enabled: true } });
  }

  function confirmDisable() {
    if (!disableTarget) return;
    updateDestination.mutate({ id: disableTarget.id, patch: { enabled: false } });
    setDisableTarget(null);
  }

  async function handleTest(destination: TrackingDestination) {
    const result = await testDestination.mutateAsync(destination.id);
    setTestResult({ id: destination.id, ...result });
  }

  if (isLoading) {
    return (
      <TrackingShell active="destinations" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
        <div className={styles.tableSkeletonWrap}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className={styles.cardSkeleton} />
          ))}
        </div>
      </TrackingShell>
    );
  }

  if (isError || !destinations) {
    return (
      <TrackingShell active="destinations" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
        <div className={styles.stateBox}>
          <div className={styles.errorIcon}>
            <AlertCircle size={28} />
          </div>
          <p className={styles.stateTitle}>{t('destinations.error')}</p>
          <Button variant="outline" onClick={() => refetch()}>
            {t('shell.retry')}
          </Button>
        </div>
      </TrackingShell>
    );
  }

  return (
    <TrackingShell active="destinations" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
      {destinations.length === 0 ? (
        <div className={styles.stateBox}>
          <div className={styles.emptyIcon}>
            <Inbox size={30} />
          </div>
          <p className={styles.stateTitle}>{t('destinations.empty.title')}</p>
          <Button onClick={() => setCreateOpen(true)}>{t('destinations.empty.cta')}</Button>
        </div>
      ) : (
        <div className={styles.list}>
          {destinations.map((d) => {
            const isOpen = openId === d.id;
            const result = testResult?.id === d.id ? testResult : null;
            return (
              <div key={d.id} className={styles.destinationCard}>
                <div className={styles.destinationHeader}>
                  <div className={styles.destinationInfo}>
                    <div className={styles.destinationTitleRow}>
                      <span className={d.enabled ? styles.destinationName : `${styles.destinationName} ${styles.muted}`}>
                        {d.name}
                      </span>
                      <span className={d.enabled ? `${styles.statusPill} ${styles.statusActive}` : `${styles.statusPill} ${styles.statusDisabled}`}>
                        {t(d.enabled ? 'destinations.status.active' : 'destinations.status.disabled')}
                      </span>
                    </div>
                    <div className={`${styles.mono} ${styles.destinationUrl}`}>{d.url}</div>
                    <div className={styles.filterChips}>
                      {(d.eventFilter.length > 0 ? d.eventFilter : ['*']).map((f) => (
                        <span key={f} className={styles.filterChip}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={styles.destinationActions}>
                    <Switch checked={d.enabled} onCheckedChange={(checked) => toggleEnabled(d, checked)} />
                    <Button variant="outline" size="sm" onClick={() => handleTest(d)} disabled={testDestination.isPending}>
                      {t('destinations.testSend')}
                    </Button>
                    <button type="button" className={styles.viewDeliveriesLink} onClick={() => setOpenId(isOpen ? null : d.id)}>
                      {t('destinations.viewDeliveries')}
                      {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>
                {result && (
                  <div className={result.error ? `${styles.testBanner} ${styles.testBannerError}` : styles.testBanner}>
                    {result.error ? t('destinations.testFailureToast', { error: result.error }) : t('destinations.testSuccessToast')}
                  </div>
                )}
                {isOpen && <DeliveriesLog destination={d} />}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('destinations.newDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className={styles.formBody}>
            <label className={styles.label} htmlFor="destination-name">
              {t('destinations.newDialog.name')}
            </label>
            <Input
              id="destination-name"
              placeholder={t('destinations.newDialog.namePlaceholder')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <label className={styles.label} htmlFor="destination-url">
              {t('destinations.newDialog.url')}
            </label>
            <Input id="destination-url" type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
            <label className={styles.label} htmlFor="destination-filter">
              {t('destinations.newDialog.filter')}
            </label>
            <textarea
              id="destination-filter"
              className={styles.textarea}
              value={newFilter}
              onChange={(e) => setNewFilter(e.target.value)}
            />
            <div className={styles.hint}>{t('destinations.newDialog.filterHint')}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t('destinations.newDialog.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || !newUrl.trim() || createDestination.isPending}>
              {t('destinations.newDialog.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={secretShown !== null} onOpenChange={(open) => !open && setSecretShown(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('destinations.secretShown.title')}</DialogTitle>
            <DialogDescription>{t('destinations.secretShown.body')}</DialogDescription>
          </DialogHeader>
          {secretShown && (
            <div className={styles.formBody}>
              <label className={styles.label}>{t('destinations.secretShown.label', { name: secretShown.name })}</label>
              <div className={styles.keyRow}>
                <span className={`${styles.mono} ${styles.keyValue}`}>{secretShown.secret}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSecretShown(null)}>{t('destinations.secretShown.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableTarget !== null} onOpenChange={(open) => !open && setDisableTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('destinations.disableConfirm.title', { name: disableTarget?.name ?? '' })}</DialogTitle>
            <DialogDescription>{t('destinations.disableConfirm.body')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableTarget(null)}>
              {t('destinations.disableConfirm.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDisable}>
              {t('destinations.disableConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TrackingShell>
  );
}
