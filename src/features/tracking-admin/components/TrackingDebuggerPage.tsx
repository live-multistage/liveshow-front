'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import { AlertCircle, ArrowRightLeft, Bolt, FileText, Inbox, Loader2, Users, X } from 'lucide-react';
import { Button, Chip, Input, SimpleCustomSelect } from '@live-show/design-system';
import type { TrackingMessageType } from '@live-show/api-contracts';
import { TrackingShell } from './TrackingShell';
import { useTrackingLiveStream, type LiveFilter, type LiveStreamFrame } from '../hooks/use-tracking-live-stream';
import { useTrackingSourcesQuery } from '../queries/get-sources';
import styles from './TrackingDebuggerPage.module.scss';

interface Props {
  trackingEnabled: boolean;
}

const TYPE_CHIPS: (TrackingMessageType | undefined)[] = [undefined, 'track', 'page', 'identify', 'group', 'alias'];

function messageIcon(type: TrackingMessageType) {
  switch (type) {
    case 'identify': return <Users size={13} />;
    case 'group': return <Users size={13} />;
    case 'alias': return <ArrowRightLeft size={13} />;
    case 'page': return <FileText size={13} />;
    default: return <Bolt size={13} />;
  }
}

function sourceLabel(id: string, namesById: Map<string, string>): string {
  return namesById.get(id) ?? id.slice(0, 8);
}

function frameName(frame: LiveStreamFrame & { kind: 'message' }): string {
  if (frame.status === 'rejected') return '—';
  const m = frame.message;
  if (m.type === 'track') return m.event;
  if (m.type === 'page') return m.name ?? m.context.page?.path ?? '—';
  if (m.type === 'identify') return m.userId ?? m.anonymousId;
  if (m.type === 'group') return m.groupId;
  return `${m.previousId} → ${m.userId ?? m.anonymousId}`;
}

export function TrackingDebuggerPage({ trackingEnabled }: Props) {
  const t = useTranslations('platformAdmin.tracking');
  const format = useFormatter();
  const searchParams = useSearchParams();
  const { data: sources } = useTrackingSourcesQuery();
  const sourceNamesById = useMemo(
    () => new Map((sources ?? []).map((s) => [s.id, s.name] as const)),
    [sources],
  );

  const [sourceId, setSourceId] = useState<string | undefined>(undefined);
  const [type, setType] = useState<TrackingMessageType | undefined>(undefined);
  const [event, setEvent] = useState('');
  const [userId, setUserId] = useState('');
  const [anonymousId, setAnonymousId] = useState(searchParams.get('anonymousId') ?? '');
  const [status, setStatus] = useState<'accepted' | 'rejected' | undefined>(undefined);
  const [paused, setPaused] = useState(false);
  const [selected, setSelected] = useState<LiveStreamFrame | null>(null);

  const filter: LiveFilter = useMemo(() => ({
    sourceId: sourceId || undefined,
    type,
    event: event || undefined,
    userId: userId || undefined,
    anonymousId: anonymousId || undefined,
    status,
  }), [sourceId, type, event, userId, anonymousId, status]);

  const { frames, dropped, status: connStatus, clear } = useTrackingLiveStream(filter, { paused });

  const title = t('debugger.title');
  const actions = (
    <>
      <span className={styles.bufferLabel}>{t('debugger.buffer', { count: frames.length })}</span>
      {dropped > 0 && <span className={styles.droppedLabel}>{t('debugger.dropped', { count: dropped })}</span>}
      <Button variant={paused ? 'default' : 'outline'} onClick={() => setPaused((p) => !p)}>
        {paused ? t('debugger.resume') : t('debugger.pause')}
      </Button>
      <Button variant="ghost" onClick={() => { clear(); setSelected(null); }}>{t('debugger.clear')}</Button>
    </>
  );

  const connPill = (
    <span className={`${styles.connPill} ${styles[connStatus]}`}>
      {connStatus === 'connecting' && <Loader2 size={12} className={styles.spin} />}
      {t(`debugger.connection.${connStatus}`)}
    </span>
  );

  return (
    <TrackingShell active="debugger" title={title} actions={<>{connPill}{actions}</>} trackingEnabled={trackingEnabled}>
      {connStatus === 'error' && (
        <div className={styles.errorBanner} role="status">
          <AlertCircle size={16} />
          <span>{t('debugger.connectionLost')}</span>
        </div>
      )}

      <div className={styles.filterBar}>
        <div className={styles.filterSelect}>
          <SimpleCustomSelect
            value={sourceId ?? 'all'}
            onValueChange={(v) => setSourceId(v === 'all' ? undefined : v)}
            placeholder={t('debugger.filters.source')}
            options={[
              { value: 'all', label: t('debugger.filters.allSources') },
              ...(sources ?? []).map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
        </div>
        <div className={styles.chips}>
          {TYPE_CHIPS.map((tc) => (
            <Chip key={tc ?? 'all'} variant={type === tc ? 'active' : 'default'} onClick={() => setType(tc)}>
              {tc ?? t('debugger.filters.typeAll')}
            </Chip>
          ))}
        </div>
        <Input
          placeholder={t('debugger.filters.eventPlaceholder')}
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          className={styles.filterInput}
        />
        <Input
          placeholder={t('debugger.filters.userIdPlaceholder')}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className={styles.filterInput}
        />
        <Input
          placeholder={t('debugger.filters.anonymousIdPlaceholder')}
          value={anonymousId}
          onChange={(e) => setAnonymousId(e.target.value)}
          className={styles.filterInput}
        />
        <div className={styles.filterSelect}>
          <SimpleCustomSelect
            value={status ?? 'all'}
            onValueChange={(v) => setStatus(v === 'all' ? undefined : (v as 'accepted' | 'rejected'))}
            options={[
              { value: 'all', label: t('debugger.filters.typeAll') },
              { value: 'accepted', label: t('debugger.inspector.accepted') },
              { value: 'rejected', label: t('debugger.inspector.rejected') },
            ]}
          />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.list}>
          <div className={styles.listHeader}>
            <span />
            <span>{t('debugger.columns.event')}</span>
            <span />
            <span>{t('debugger.columns.source')}</span>
            <span className={styles.right}>{t('debugger.columns.time')}</span>
          </div>
          <div className={styles.rows}>
            {frames.length === 0 && (
              <div className={styles.empty}>
                {connStatus === 'connecting' ? <Loader2 size={26} className={styles.spin} /> : <Inbox size={26} />}
                <p>{connStatus === 'connecting' ? t('debugger.connectingMessage') : t('debugger.empty')}</p>
              </div>
            )}
            {frames.map((frame) => {
              if (frame.kind === 'dropped') return null;
              const rejected = frame.status === 'rejected';
              const violations = frame.status === 'accepted' ? frame.message.violations : null;
              const isSelected = selected === frame;
              return (
                <div
                  key={frame.key}
                  className={`${styles.row} ${isSelected ? styles.rowSelected : ''} ${rejected ? styles.rowRejected : ''}`}
                  onClick={() => setSelected(frame)}
                >
                  <span className={styles.iconWrap}>{rejected ? <X size={13} /> : messageIcon(frame.message.type)}</span>
                  <div className={styles.nameCol}>
                    <div className={`${styles.name} ${rejected ? styles.nameRejected : ''}`}>{frameName(frame)}</div>
                    {rejected && <div className={styles.reason}>{frame.reason}</div>}
                  </div>
                  <div>
                    {rejected && <span className={styles.badgeRejected}>{t('debugger.badges.rejected')}</span>}
                    {!rejected && violations && violations.length > 0 && (
                      <span className={styles.badgeViolation}>
                        {violations.length === 1 ? t('debugger.badges.violation') : t('debugger.badges.violations', { count: violations.length })}
                      </span>
                    )}
                  </div>
                  <span className={styles.sourceCell}>
                    {sourceLabel(rejected ? frame.sourceId : frame.message.sourceId, sourceNamesById)}
                  </span>
                  <span className={`${styles.mono} ${styles.right}`}>
                    {format.dateTime(new Date(frame.receivedAt), { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.inspector}>
          {!selected && (
            <div className={styles.noSelection}>
              <p>{t('debugger.noSelection')}</p>
            </div>
          )}
          {selected && selected.kind === 'message' && (
            <div className={styles.inspectorContent}>
              <div className={styles.inspectorHeader}>
                <div className={styles.inspectorHeaderRow}>
                  <span className={styles.iconWrap}>{selected.status === 'rejected' ? <X size={13} /> : messageIcon(selected.message.type)}</span>
                  <span className={styles.inspectorName}>{frameName(selected)}</span>
                  <span className={selected.status === 'rejected' ? styles.badgeRejected : styles.badgeAccepted}>
                    {selected.status === 'rejected' ? t('debugger.inspector.rejected') : t('debugger.inspector.accepted')}
                  </span>
                </div>
              </div>
              <div className={styles.inspectorBody}>
                {selected.status === 'accepted' && selected.message.violations && selected.message.violations.length > 0 && (
                  <div>
                    <div className={styles.sectionLabel}>{t('debugger.inspector.violationsTitle', { count: selected.message.violations.length })}</div>
                    <div className={styles.violations}>
                      {selected.message.violations.map((v, i) => (
                        <div key={i} className={styles.violation}>
                          <AlertCircle size={14} />
                          <div>
                            <div>{v.kind} <span className={styles.mono}>{v.property}</span></div>
                            {v.detail && <div className={styles.mono}>{v.detail}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selected.status === 'rejected' && (
                  <div>
                    <div className={styles.inspectorReason}>
                      <AlertCircle size={14} />
                      <div>
                        <div>{t('debugger.inspector.bodyUnreadable')}</div>
                        <div className={styles.mono}>{selected.reason}</div>
                      </div>
                    </div>
                    <div className={styles.sectionLabel}>{t('debugger.inspector.rawTitle')}</div>
                    <pre className={styles.rawBlock}>{typeof selected.raw === 'string' ? selected.raw : JSON.stringify(selected.raw)}</pre>
                  </div>
                )}
                {selected.status === 'accepted' && (
                  <div>
                    <div className={styles.inspectorRow}>
                      <span className={styles.sectionLabel}>{t('debugger.inspector.messageTitle')}</span>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => { void navigator.clipboard?.writeText(JSON.stringify(selected.message, null, 2)); }}
                      >
                        {t('debugger.inspector.copyJson')}
                      </button>
                    </div>
                    <pre className={styles.rawBlock}>{JSON.stringify(selected.message, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </TrackingShell>
  );
}
