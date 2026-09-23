'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Megaphone, AlertCircle } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@live-show/design-system';
import { useChangeHouseAdStatusMutation } from '../house-ads/mutations/house-ads.mutations';
import { HOUSE_AD_FORMAT_LABEL, HOUSE_AD_PLACEMENT_LABEL, HOUSE_AD_PRIORITY_LABEL, HOUSE_AD_STATUS_LABEL, canEditHouseAd } from '../house-ads/labels';
import type { HouseAdListItem, HouseAdStatus } from '../house-ads/types/house-ads.types';
import { Pager } from './PlatformEventsPage';
// F4's performance drawer — imported by direct path per the branch's
// file-ownership split.
import { HouseAdReportDrawer } from './HouseAdReportDrawer';
import table from './PlatformTable.module.scss';
import styles from './HouseAdsTab.module.scss';

const COLS = 'minmax(0,2.4fr) minmax(0,1.5fr) 118px 110px 120px 100px 90px 64px 150px';

function statusBadgeClass(status: HouseAdStatus): string {
  if (status === 'ACTIVE') return table.badgeGreen;
  if (status === 'PAUSED') return table.badgeViolet;
  if (status === 'REJECTED') return table.badgeRed;
  if (status === 'REVIEW') return table.badgeAmber;
  return table.badge; // DRAFT, ENDED
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
// The API already returns a percentage (see ad-metrics.ts computeCtr:
// Number((clicks * 10000n) / impressions) / 100 — 2% arrives as `2`, not
// `0.02`), so this only formats, it never rescales.
const fmtCtr = (ctr: number | null) => (ctr === null ? '—' : `${ctr.toFixed(2)}%`);
const fmtCompact = (n: number) => (n < 1000 ? String(n) : `${(n / 1000).toFixed(1).replace('.', ',')}k`);

function destinationLabel(item: HouseAdListItem): string {
  if (item.destination === null) return 'Sem destino';
  if (item.destination.type === 'EXTERNAL_URL') return item.destination.url;
  return `Evento · ${item.destination.eventId}`;
}

interface Props {
  items: HouseAdListItem[];
  total: number;
  page: number;
  limit: number;
  onPage: (page: number) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilter: boolean;
  onClearFilter: () => void;
  onCreate: () => void;
  onEdit: (ad: HouseAdListItem) => void;
}

// A2 (tabs) live in PlatformAdsPage; this owns A1/A3-A8 — the "Anúncios da
// plataforma" list, its row actions and its loading/empty/error states. The
// create/edit wizard's open state lives in PlatformAdsPage (its "Novo
// anúncio" button is in the shell's actions slot, outside this component).
export function HouseAdsTab({ items, total, page, limit, onPage, isLoading, isError, onRetry, hasFilter, onClearFilter, onCreate, onEdit }: Props) {
  const [endTarget, setEndTarget] = useState<HouseAdListItem | null>(null);
  const [reportTarget, setReportTarget] = useState<HouseAdListItem | null>(null);
  const changeStatus = useChangeHouseAdStatusMutation();
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (isError) {
    return (
      <div className={styles.emptyWrap}>
        <div className={styles.errorIcon}><AlertCircle size={28} strokeWidth={1.8} /></div>
        <div className={styles.emptyTitle}>Não foi possível carregar os anúncios.</div>
        <Button variant="outline" onClick={onRetry}>Tentar de novo</Button>
      </div>
    );
  }

  if (!isLoading && total === 0 && hasFilter) {
    return (
      <div className={styles.emptyWrap}>
        <div className={styles.emptyTitle}>Nenhum anúncio encontrado para este filtro.</div>
        <div className={styles.emptyDesc}>Troque o filtro para ver os outros anúncios.</div>
        <Button variant="outline" onClick={onClearFilter}>Limpar filtro</Button>
      </div>
    );
  }

  if (!isLoading && total === 0) {
    return (
      <div className={styles.emptyWrap}>
        <div className={styles.emptyIcon}><Megaphone size={28} strokeWidth={1.8} /></div>
        <div className={styles.emptyTitle}>Nenhum anúncio da plataforma ainda.</div>
        <div className={styles.emptyDesc}>Divulgue um evento, um canal ou um aviso da showon.io, sem custo.</div>
        <Button onClick={onCreate}>+ Novo anúncio</Button>
      </div>
    );
  }

  return (
    <div className={table.card}>
      <div className={table.scroll}>
        <div className={`${table.head} ${styles.headResponsive}`} style={{ gridTemplateColumns: COLS }}>
          <span>Anúncio</span><span>Posições</span><span>Período</span><span>Status</span><span>Prioridade</span>
          <span className={table.right}>Impressões 30d</span><span className={table.right}>Cliques 30d</span><span className={table.right}>CTR</span><span className={table.right}>Ações</span>
        </div>

        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonRow}>
            <div className={styles.skeletonThumb} />
            <div className={styles.skeletonBar} />
            <div className={styles.skeletonPill} />
          </div>
        ))}

        {!isLoading && items.map((item) => (
          <HouseAdRow
            key={item.id}
            item={item}
            onEnd={() => setEndTarget(item)}
            onViewReport={() => setReportTarget(item)}
            onEdit={() => onEdit(item)}
            onPauseResume={(action) =>
              changeStatus.mutate(
                { id: item.id, action },
                {
                  onSuccess: () => toast.success(action === 'pause' ? 'Anúncio pausado.' : 'Anúncio retomado.'),
                  onError: (err) => toast.error(err.message),
                }
              )
            }
            pending={changeStatus.isPending}
          />
        ))}
      </div>

      {total > 0 && <Pager page={page} totalPages={totalPages} total={total} limit={limit} onPage={onPage} />}

      <Dialog open={endTarget !== null} onOpenChange={(open) => !open && setEndTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar este anúncio?</DialogTitle>
            <DialogDescription>
              Ele para de ser exibido agora e não pode ser reativado. Para voltar a exibir, crie um novo anúncio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndTarget(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={changeStatus.isPending}
              onClick={() => {
                if (!endTarget) return;
                changeStatus.mutate(
                  { id: endTarget.id, action: 'end' },
                  {
                    onSuccess: () => { toast.success('Anúncio encerrado.'); setEndTarget(null); },
                    onError: (err) => toast.error(err.message),
                  }
                );
              }}
            >
              Encerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reportTarget && (
        <HouseAdReportDrawer
          ad={reportTarget}
          onClose={() => setReportTarget(null)}
          onEdit={() => { onEdit(reportTarget); setReportTarget(null); }}
        />
      )}
    </div>
  );
}

function HouseAdRow({ item, onEnd, onViewReport, onEdit, onPauseResume, pending }: {
  item: HouseAdListItem;
  onEnd: () => void;
  onViewReport: () => void;
  onEdit: () => void;
  onPauseResume: (action: 'pause' | 'resume') => void;
  pending: boolean;
}) {
  const canPause = item.status === 'ACTIVE';
  const canResume = item.status === 'PAUSED';
  const canEnd = item.status === 'ACTIVE' || item.status === 'PAUSED' || item.status === 'DRAFT';
  const canEdit = canEditHouseAd(item.status);

  return (
    <div
      className={`${table.row} ${styles.rowResponsive} ${styles.rowClickable}`}
      style={{ gridTemplateColumns: COLS }}
      onClick={onViewReport}
    >
      <div className={`${table.primary} ${styles.adCell} ${styles.cellLabeled}`} data-label="ANÚNCIO">
        <div className={styles.thumb}>
          <span className={styles.thumbFormat}>{HOUSE_AD_FORMAT_LABEL[item.format]}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <button type="button" className={styles.adTitleButton} onClick={onViewReport}>{item.title}</button>
          <div className={styles.adDest}>{destinationLabel(item)}</div>
        </div>
      </div>

      <div className={`${styles.positions} ${styles.cellLabeled}`} data-label="POSIÇÕES">
        {item.placements.map((p) => <span key={p} className={styles.positionChip}>{HOUSE_AD_PLACEMENT_LABEL[p]}</span>)}
      </div>

      <div className={`${styles.period} ${styles.cellLabeled}`} data-label="PERÍODO">
        {fmtDate(item.startsAt)}<br /><span className={styles.periodEnd}>até {fmtDate(item.endsAt)}</span>
      </div>

      <div className={styles.cellLabeled} data-label="STATUS">
        <span className={`${table.badge} ${statusBadgeClass(item.status)}`}>{HOUSE_AD_STATUS_LABEL[item.status]}</span>
      </div>

      <div className={styles.cellLabeled} data-label="PRIORIDADE">
        {item.housePriority && (
          <span className={`${styles.priorityPill} ${item.housePriority === 'PRIORITY' ? styles.priorityPriority : styles.priorityFill}`}>
            {HOUSE_AD_PRIORITY_LABEL[item.housePriority]}
          </span>
        )}
        {!item.housePriority && '—'}
      </div>

      <div className={`${table.mono} ${table.right} ${styles.cellLabeled}`} data-label="IMPRESSÕES 30D">{fmtCompact(item.impressions30d)}</div>
      <div className={`${table.mono} ${table.right} ${styles.cellLabeled}`} data-label="CLIQUES 30D">{fmtCompact(item.clicks30d)}</div>
      <div className={`${table.mono} ${table.right} ${styles.cellLabeled}`} data-label="CTR">{fmtCtr(item.ctr30d)}</div>

      <div
        className={`${table.actions} ${styles.actionsResponsive} ${styles.cellLabeled}`}
        data-label="AÇÕES"
        onClick={(e) => e.stopPropagation()}
      >
        {canPause && (
          <button className={table.actionBtn} onClick={() => onPauseResume('pause')} disabled={pending}>Pausar</button>
        )}
        {canResume && (
          <button className={`${table.actionBtn} ${table.actionGreen}`} onClick={() => onPauseResume('resume')} disabled={pending}>Retomar</button>
        )}
        {canEnd && (
          <button className={`${table.actionBtn} ${table.actionDanger}`} onClick={onEnd} disabled={pending}>Encerrar</button>
        )}
        <button
          className={table.actionBtn}
          onClick={onEdit}
          disabled={!canEdit}
          title={canEdit ? undefined : 'Pause o anúncio para editar'}
        >
          Editar
        </button>
        <button className={table.actionBtn} onClick={onViewReport}>Ver desempenho</button>
      </div>
    </div>
  );
}
