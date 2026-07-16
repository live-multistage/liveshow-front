// Shared audit-log presentation: action labels, severity tone buckets, and
// metadata/time formatting. Used by the overview AuditLogCard and the full
// audit page so the two never drift.

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  ROLE_CHANGED: 'ROLE',
  ORG_APPROVED: 'APROVOU',
  ORG_REJECTED: 'REJEITOU',
  FEE_RATE_SET: 'TAXA GLOBAL',
  FEE_OVERRIDE_SET: 'TAXA ORG',
  PAYOUT: 'PAYOUT',
  IMPERSONATION_START: 'IMPERSONAR',
  IMPERSONATION_END: 'FIM IMPERSONAR',
  EVENT_MODERATED: 'EVENTO',
  AD_MODERATED: 'ANÚNCIO',
  COUPON_DEACTIVATED: 'CUPOM',
};

// Every action known to the trail — drives the page's filter dropdown.
export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABELS);

export const AUDIT_DANGER = new Set(['ORG_REJECTED', 'IMPERSONATION_START', 'EVENT_MODERATED', 'COUPON_DEACTIVATED']);
export const AUDIT_MONEY = new Set(['PAYOUT', 'FEE_RATE_SET', 'FEE_OVERRIDE_SET']);

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditMetaLine(meta: Record<string, unknown> | null): string {
  if (!meta) return '';
  const parts: string[] = [];
  if (typeof meta.role === 'string') parts.push(meta.role);
  if (meta.rate != null) parts.push(`${(Number(meta.rate) * 100).toFixed(1).replace('.', ',')}%`);
  if (meta.rate === null) parts.push('override removido');
  if (typeof meta.reason === 'string') parts.push(meta.reason);
  if (meta.amount != null) parts.push(`R$ ${Number(meta.amount).toFixed(2).replace('.', ',')}`);
  return parts.join(' · ');
}

export function auditRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
