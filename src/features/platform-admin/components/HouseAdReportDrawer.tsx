'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@live-show/design-system';
import { toast } from 'sonner';
import { useHouseAdReportQuery } from '../house-ads/queries/house-ads.queries';
import { useChangeHouseAdStatusMutation } from '../house-ads/mutations/house-ads.mutations';
import type { HouseAdListItem, HouseAdStatus } from '../house-ads/types/house-ads.types';
import styles from './HouseAdReportDrawer.module.scss';

interface Props {
  ad: HouseAdListItem | null;
  onClose: () => void;
  onEdit: (adId: string) => void;
}

const STATUS_LABELS: Record<HouseAdStatus, string> = {
  DRAFT: 'RASCUNHO',
  REVIEW: 'EM REVISÃO',
  ACTIVE: 'ATIVO',
  PAUSED: 'PAUSADO',
  ENDED: 'ENCERRADO',
  REJECTED: 'REJEITADO',
};

const STATUS_COLORS: Record<HouseAdStatus, string> = {
  DRAFT: '#a1a1aa',
  REVIEW: '#ffd166',
  ACTIVE: '#7fe0a0',
  PAUSED: '#ff8f8f',
  ENDED: '#7d7d85',
  REJECTED: '#ff8f8f',
};

const PRIORITY_LABELS: Record<string, string> = {
  PRIORITY: 'Prioridade',
  FILL: 'Preenchimento',
};

const PLACEMENT_LABELS: Record<string, string> = {
  FEED: 'Feed',
  EVENT_DETAIL: 'Detalhe do evento',
  CHECKOUT: 'Checkout',
  POST_PURCHASE: 'Pós-compra',
  PLAYER_PAUSE: 'Pausa no player',
  PRE_ROLL: 'Pré-roll',
};

const formatPercent = (value: number | null) => {
  if (value === null || isNaN(value)) return '—';
  return `${(value * 100).toFixed(2)}%`;
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export function HouseAdReportDrawer({ ad, onClose, onEdit }: Props) {
  const { data: report, isLoading, isError } = useHouseAdReportQuery(ad?.id ?? null);
  const statusMutation = useChangeHouseAdStatusMutation();
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!ad) return null;

  const handleStatusChange = async (action: 'pause' | 'resume') => {
    try {
      await statusMutation.mutateAsync({ id: ad.id, action });
      toast.success(`Anúncio ${action === 'pause' ? 'pausado' : 'retomado'} com sucesso`);
    } catch (err) {
      toast.error('Não foi possível alterar o status do anúncio');
    }
  };

  const handleEnd = async () => {
    try {
      await statusMutation.mutateAsync({ id: ad.id, action: 'end' });
      toast.success('Anúncio encerrado com sucesso');
      setEndConfirmOpen(false);
      onClose();
    } catch (err) {
      toast.error('Não foi possível encerrar o anúncio');
    }
  };

  const handleEdit = () => {
    onEdit(ad.id);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside
        className={styles.drawer}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Painel de desempenho do anúncio"
        ref={drawerRef}
      >
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>DESEMPENHO · 30 DIAS</div>
            <div className={styles.title}>{ad.title}</div>
            <div className={styles.subtitle}>{ad.format}</div>
            {ad.destination && (
              <div className={styles.destination}>
                {ad.destination.type === 'EVENT' ? `Evento: ${ad.destination.eventId}` : ad.destination.url}
              </div>
            )}
            <div className={styles.badges}>
              <span className={styles.statusBadge} style={{ color: STATUS_COLORS[ad.status] }}>
                <span className={styles.dot} style={{ backgroundColor: STATUS_COLORS[ad.status] }}></span>
                {STATUS_LABELS[ad.status]}
              </span>
              {ad.housePriority && (
                <span className={styles.priorityBadge}>
                  <span className={styles.prioIcon}>◆</span>
                  {PRIORITY_LABELS[ad.housePriority]}
                </span>
              )}
              <span className={styles.period}>
                {formatDate(ad.startsAt)} – {formatDate(ad.endsAt)}
              </span>
            </div>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
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
                    {report.dailyBreakdown.length > 0 && (
                      <div className={styles.peak}>
                        pico{' '}
                        {Math.max(...report.dailyBreakdown.map((d) => d.impressions)).toLocaleString('pt-BR')} ·{' '}
                        {formatDate(
                          report.dailyBreakdown.reduce((max, d) =>
                            new Date(d.date) > new Date(max.date) ? d : max
                          ).date
                        )}
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
                        <div className={styles.placementName}>{PLACEMENT_LABELS[row.placement] || row.placement}</div>
                        <div className={styles.tableCell}>{row.impressions.toLocaleString('pt-BR')}</div>
                        <div className={styles.tableCell}>{row.clicks.toLocaleString('pt-BR')}</div>
                        <div className={styles.tableCell} style={{ color: '#ff8ec9' }}>
                          {formatPercent(row.ctr)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Details */}
                <div className={styles.section}>
                  <div className={styles.detailsGrid}>
                    <div>
                      <span className={styles.detailLabel}>Destino</span>
                      <span className={styles.detailValue}>
                        {ad.destination?.type === 'EVENT' ? ad.destination.eventId : ad.destination?.url || '—'}
                      </span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Público</span>
                      <span className={styles.detailValue}>—</span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Frequência</span>
                      <span className={styles.detailValue}>até 3 por pessoa por dia</span>
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
          <Button variant="outline" size="default" onClick={handleEdit}>
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
      </aside>

      {/* End confirmation dialog */}
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
    </div>
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
