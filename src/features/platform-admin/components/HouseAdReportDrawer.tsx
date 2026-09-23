'use client';

import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@live-show/design-system';
import { AGE_BRACKET_LABELS } from '@live-show/api-contracts';
import { toast } from 'sonner';
import { useHouseAdQuery, useHouseAdReportQuery } from '../house-ads/queries/house-ads.queries';
import { useChangeHouseAdStatusMutation } from '../house-ads/mutations/house-ads.mutations';
import { HOUSE_AD_FORMAT_LABEL, HOUSE_AD_PLACEMENT_LABEL, HOUSE_AD_PRIORITY_LABEL, HOUSE_AD_STATUS_LABEL, canEditHouseAd } from '../house-ads/labels';
import type { HouseAdListItem } from '../house-ads/types/house-ads.types';
import styles from './HouseAdReportDrawer.module.scss';

interface Props {
  ad: HouseAdListItem | null;
  onClose: () => void;
  onEdit: (adId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#a1a1aa',
  REVIEW: '#ffd166',
  ACTIVE: '#7fe0a0',
  PAUSED: '#ff8f8f',
  ENDED: '#7d7d85',
  REJECTED: '#ff8f8f',
};

// The API already returns a percentage (see ad-metrics.ts computeCtr:
// Number((clicks * 10000n) / impressions) / 100 — 2% arrives as `2`, not
// `0.02`), so this only formats, it never rescales.
const formatPercent = (value: number | null) => {
  if (value === null || isNaN(value)) return '—';
  return `${value.toFixed(2)}%`;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const list = (arr: string[]) => (arr.length ? arr.join(', ') : null);

export function HouseAdReportDrawer({ ad, onClose, onEdit }: Props) {
  const { data: report, isLoading, isError } = useHouseAdReportQuery(ad?.id ?? null);
  const { data: detail, isLoading: isDetailLoading } = useHouseAdQuery(ad?.id ?? null);
  const statusMutation = useChangeHouseAdStatusMutation();
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

  if (!ad) return null;

  const handleStatusChange = async (action: 'pause' | 'resume') => {
    try {
      await statusMutation.mutateAsync({ id: ad.id, action });
      toast.success(action === 'pause' ? 'Anúncio pausado.' : 'Anúncio retomado.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível alterar o status do anúncio.');
    }
  };

  const handleEnd = async () => {
    try {
      await statusMutation.mutateAsync({ id: ad.id, action: 'end' });
      toast.success('Anúncio encerrado.');
      setEndConfirmOpen(false);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível encerrar o anúncio.');
    }
  };

  const canEdit = canEditHouseAd(ad.status);
  const targeting = list([...(detail?.targetDomains ?? []), ...(detail?.targetCategories ?? [])]);
  const ageBrackets = detail?.targetAgeBrackets.length ? detail.targetAgeBrackets.map((b) => AGE_BRACKET_LABELS[b]).join(', ') : null;
  const frequency = detail?.frequencyCapMax != null
    ? `${detail.frequencyCapMax}x / ${detail.frequencyCapWindow === 'day' ? 'dia' : 'total'}`
    : 'Sem limite';

  // Peak day: the highest-impressions day, not the latest date in the range.
  const peak = report && report.dailyBreakdown.length > 0
    ? report.dailyBreakdown.reduce((max, d) => (d.impressions > max.impressions ? d : max))
    : null;

  return (
    // Radix Dialog gives us the focus trap, initial focus, focus restore and
    // scoped Escape handling a hand-rolled <aside role="dialog"> didn't have
    // — including not stealing Escape from the nested "Encerrar" confirm
    // dialog below, which is itself a Radix dialog.
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.backdrop} />
        <DialogPrimitive.Content className={styles.drawer} aria-describedby={undefined} aria-modal="true">
          <div className={styles.header}>
            <div>
              <div className={styles.eyebrow}>DESEMPENHO · 30 DIAS</div>
              <DialogPrimitive.Title className={styles.title}>{ad.title}</DialogPrimitive.Title>
              <div className={styles.subtitle}>{HOUSE_AD_FORMAT_LABEL[ad.format]}</div>
              {ad.destination && (
                <div className={styles.destination}>
                  {ad.destination.type === 'EVENT' ? `Evento: ${ad.destination.eventId}` : ad.destination.url}
                </div>
              )}
              <div className={styles.badges}>
                <span className={styles.statusBadge} style={{ color: STATUS_COLORS[ad.status] }}>
                  <span className={styles.dot} style={{ backgroundColor: STATUS_COLORS[ad.status] }}></span>
                  {HOUSE_AD_STATUS_LABEL[ad.status]}
                </span>
                {ad.housePriority && (
                  <span className={styles.priorityBadge}>
                    <span className={styles.prioIcon}>◆</span>
                    {HOUSE_AD_PRIORITY_LABEL[ad.housePriority]}
                  </span>
                )}
                <span className={styles.period}>
                  {formatDate(ad.startsAt)} – {formatDate(ad.endsAt)}
                </span>
              </div>
            </div>
            <DialogPrimitive.Close className={styles.close} aria-label="Fechar">
              <X size={18} />
            </DialogPrimitive.Close>
          </div>

          {isLoading && (
            <div className={styles.body}>
              <div className={styles.loadingMessage}>Carregando…</div>
            </div>
          )}

          {isError && (
            <div className={styles.body}>
              <div className={styles.errorMessage}>Não foi possível carregar os dados do anúncio.</div>
            </div>
          )}

          {report && (
            <>
              {report.impressions === 0 ? (
                <div className={styles.body}>
                  <div className={styles.emptyState}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path>
                    </svg>
                    <div className={styles.emptyTitle}>Este anúncio ainda não teve exibições.</div>
                    <div className={styles.emptyText}>Os números aparecem aqui assim que ele entrar no ar.</div>
                  </div>
                </div>
              ) : (
                <div className={styles.body}>
                  {/* KPIs */}
                  <div className={styles.kpis}>
                    <div className={styles.kpi}>
                      <div className={styles.kpiLabel}>IMPRESSÕES</div>
                      <div className={styles.kpiValue}>{report.impressions.toLocaleString('pt-BR')}</div>
                    </div>
                    <div className={styles.kpi}>
                      <div className={styles.kpiLabel}>CLIQUES</div>
                      <div className={styles.kpiValue}>{report.clicks.toLocaleString('pt-BR')}</div>
                    </div>
                    <div className={styles.kpi}>
                      <div className={styles.kpiLabel}>CTR</div>
                      <div className={styles.kpiValue} style={{ color: '#ff8ec9' }}>
                        {formatPercent(report.ctr)}
                      </div>
                    </div>
                  </div>

                  {/* Daily series */}
                  <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionLabel}>IMPRESSÕES POR DIA</div>
                      {peak && (
                        <div className={styles.peak}>
                          pico {peak.impressions.toLocaleString('pt-BR')} · {formatDate(peak.date)}
                        </div>
                      )}
                    </div>
                    <BarChart data={report.dailyBreakdown} />
                    {report.dailyBreakdown.length > 0 && (
                      <div className={styles.barLabels}>
                        <span>{formatDate(report.dailyBreakdown[0].date)}</span>
                        <span>{formatDate(report.dailyBreakdown[Math.floor(report.dailyBreakdown.length / 2)].date)}</span>
                        <span>{formatDate(report.dailyBreakdown[report.dailyBreakdown.length - 1].date)}</span>
                      </div>
                    )}
                  </div>

                  {/* Placement breakdown */}
                  <div className={styles.section}>
                    <div className={styles.sectionLabel}>POR POSIÇÃO</div>
                    <div className={styles.placementTable}>
                      <div className={styles.tableHeader}>
                        <div>POSIÇÃO</div>
                        <div>IMPR.</div>
                        <div>CLIQUES</div>
                        <div>CTR</div>
                      </div>
                      {report.placementBreakdown.map((row) => (
                        <div key={row.placement} className={styles.tableRow}>
                          <div className={styles.placementName}>{HOUSE_AD_PLACEMENT_LABEL[row.placement] ?? row.placement}</div>
                          <div className={styles.tableCell}>{row.impressions.toLocaleString('pt-BR')}</div>
                          <div className={styles.tableCell}>{row.clicks.toLocaleString('pt-BR')}</div>
                          <div className={styles.tableCell} style={{ color: '#ff8ec9' }}>
                            {formatPercent(row.ctr)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Details — only real, fetched values; no invented copy. */}
                  <div className={styles.section}>
                    <div className={styles.detailsGrid}>
                      <div>
                        <span className={styles.detailLabel}>Destino</span>
                        <span className={styles.detailValue}>
                          {ad.destination?.type === 'EVENT' ? ad.destination.eventId : ad.destination?.url || '—'}
                        </span>
                      </div>
                      <div>
                        <span className={styles.detailLabel}>Segmentação</span>
                        <span className={styles.detailValue}>
                          {isDetailLoading ? 'Carregando…' : [targeting, ageBrackets].filter(Boolean).join(' · ') || 'Sem segmentação'}
                        </span>
                      </div>
                      <div>
                        <span className={styles.detailLabel}>Frequência</span>
                        <span className={styles.detailValue}>{isDetailLoading ? 'Carregando…' : frequency}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer actions */}
          <div className={styles.footer}>
            {ad.status === 'ACTIVE' && (
              <Button
                variant="outline"
                size="default"
                onClick={() => handleStatusChange('pause')}
                disabled={statusMutation.isPending}
              >
                Pausar
              </Button>
            )}
            {ad.status === 'PAUSED' && (
              <Button
                variant="outline"
                size="default"
                onClick={() => handleStatusChange('resume')}
                disabled={statusMutation.isPending}
              >
                Retomar
              </Button>
            )}
            <Button
              variant="outline"
              size="default"
              onClick={() => onEdit(ad.id)}
              disabled={!canEdit}
              title={canEdit ? undefined : 'Pause o anúncio para editar'}
            >
              Editar
            </Button>
            <div style={{ flex: 1 }}></div>
            {ad.status !== 'ENDED' && (
              <Button
                variant="destructive"
                size="default"
                onClick={() => setEndConfirmOpen(true)}
                disabled={statusMutation.isPending}
              >
                Encerrar
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      {/* End confirmation dialog — a separate, nested Radix dialog; its own
          Escape handling is scoped to itself and won't also close this one. */}
      <Dialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar este anúncio?</DialogTitle>
          </DialogHeader>
          <p>
            Ele para de ser exibido agora e não pode ser reativado. Para voltar a exibir, crie um novo anúncio.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleEnd} disabled={statusMutation.isPending}>
              Encerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogPrimitive.Root>
  );
}

function BarChart({ data }: { data: Array<{ date: string; impressions: number; clicks: number }> }) {
  if (data.length === 0) return null;

  const maxImpressions = Math.max(...data.map((d) => d.impressions));
  const normalizer = maxImpressions > 0 ? maxImpressions : 1;

  return (
    <div className={styles.barChart}>
      {data.map((point) => (
        <div
          key={point.date}
          className={styles.bar}
          style={{
            height: `${(point.impressions / normalizer) * 100}%`,
            flex: 1,
            minWidth: 0,
          }}
        ></div>
      ))}
    </div>
  );
}
