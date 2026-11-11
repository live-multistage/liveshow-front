'use client';

import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { useAuditSearchQuery } from '../queries/get-audit';
import type { AuditLogEntry } from '../types/platform-admin.types';
import {
  auditActionLabel,
  auditMetaLine,
  AUDIT_ACTIONS,
  AUDIT_DANGER,
  AUDIT_MONEY,
} from '../utils/audit-format';
import { summarizeUserAgent } from '../utils/user-agent';
import { AuditRowDetail } from './AuditRowDetail';
import { PlatformPageShell } from './PlatformPageShell';
import styles from './PlatformAuditPage.module.scss';

const PAGE_SIZE = 25;

function fmtAbsolute(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// D8 — Audit log. Filterable + paginated view of the audit trail (the
// overview card shows only the latest 20). Read-only: no edit/delete path.
export function PlatformAuditPage() {
  const t = useTranslations('platformAdmin');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useAuditSearchQuery({
    page,
    limit: PAGE_SIZE,
    action: action || undefined,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PlatformPageShell
      group="GOVERNANÇA"
      title="Audit log"
      subtitle="Trilha de ações sensíveis da plataforma. Somente leitura nesta tela."
      actions={
        <select
          className={styles.filter}
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          aria-label={t('filterByAction')}
        >
          <option value="">{t('allActions')}</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>{auditActionLabel(a)}</option>
          ))}
        </select>
      }
    >
      <div className={styles.card}>
        {isLoading && <div className={styles.empty}>Carregando…</div>}
        {isError && <div className={styles.empty}>Não foi possível carregar o audit log.</div>}
        {!isLoading && !isError && total === 0 && (
          <div className={styles.empty}>Nenhuma ação registrada para este filtro.</div>
        )}

        <div className={styles.list}>
          {data?.items.map((e) => <AuditRow key={e.id} e={e} />)}
        </div>

        {total > 0 && (
          <div className={styles.pager}>
            <span className={styles.pagerInfo}>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </span>
            <div className={styles.pagerBtns}>
              <button
                className={styles.pagerBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Anterior
              </button>
              <button
                className={styles.pagerBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>
    </PlatformPageShell>
  );
}

function AuditRow({ e }: { e: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const tone = AUDIT_DANGER.has(e.action)
    ? styles.actionDanger
    : AUDIT_MONEY.has(e.action)
      ? styles.actionMoney
      : '';
  const meta = auditMetaLine(e.metadata);
  const browser = summarizeUserAgent(e.userAgent);

  return (
    <div className={styles.item}>
      <div className={styles.row}>
        <span className={`${styles.action} ${tone}`}>{auditActionLabel(e.action)}</span>
        <span className={styles.body}>
          <span className={styles.actor}>{e.actorName ?? 'Sistema'}</span>
          {e.impersonator && (
            <span className={styles.via}>via {e.impersonator.name ?? 'admin'}</span>
          )}
          {e.targetLabel && <> → <span className={styles.target}>{e.targetLabel}</span></>}
          {meta && <span className={styles.meta}>{meta}</span>}
        </span>
        <span className={styles.origin} title={e.userAgent ?? undefined}>
          {e.ip || browser ? (
            <>
              {e.ip && <span className={styles.ip}>{e.ip}</span>}
              {browser && <span className={styles.meta}>{browser}</span>}
            </>
          ) : (
            <span className={styles.none}>Origem não registrada</span>
          )}
        </span>
        <span className={styles.time}>{fmtAbsolute(e.createdAt)}</span>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={detailId}
          aria-label={open ? 'Ocultar detalhes' : 'Ver detalhes'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '▴' : '▾'}
        </button>
      </div>
      {open && (
        <div id={detailId}>
          <AuditRowDetail e={e} />
        </div>
      )}
    </div>
  );
}
