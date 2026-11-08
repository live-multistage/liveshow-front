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
  ROLE_ASSIGNED: 'PAPEL ATRIBUÍDO',
  ROLE_REVOKED: 'PAPEL REMOVIDO',
  ORG_MEMBER_ROLE_CHANGED: 'PAPEL NA ORG',
  ORG_STATUS_SET: 'STATUS ORG',
  ORG_MEMBER_ADDED: 'MEMBRO ADD',
  ORG_CREATED: 'ORG CRIADA',
  ORG_FEATURE_FLAG_SET: 'FLAG ORG',
  PASSWORD_CHANGED: 'SENHA ALTERADA',
  PASSWORD_RESET_REQUESTED: 'RESET SOLICITADO',
  PASSWORD_RESET: 'SENHA REDEFINIDA',
  ACCOUNT_DELETED: 'CONTA EXCLUÍDA',
  PROFILE_UPDATED: 'PERFIL',
  SESSION_REVOKED: 'SESSÃO ENCERRADA',
  SESSIONS_REVOKED_ALL: 'TODAS AS SESSÕES',
  DATA_EXPORTED: 'DADOS EXPORTADOS',
  DATA_ERASURE_REQUESTED: 'PEDIDO DE EXCLUSÃO',
  CONSENT_CHANGED: 'CONSENTIMENTO',
  ORGANIZER_APPLICATION_APPROVED: 'ORGANIZADOR APROVADO',
  ORGANIZER_APPLICATION_REJECTED: 'ORGANIZADOR RECUSADO',
  ARTIST_APPLICATION_APPROVED: 'ARTISTA APROVADO',
  ARTIST_APPLICATION_REJECTED: 'ARTISTA RECUSADO',
};

// Every action known to the trail — drives the page's filter dropdown.
export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABELS);

export const AUDIT_DANGER = new Set([
  'ORG_REJECTED',
  'IMPERSONATION_START',
  'EVENT_MODERATED',
  'COUPON_DEACTIVATED',
  'ROLE_REVOKED',
  'ACCOUNT_DELETED',
  'SESSIONS_REVOKED_ALL',
  'DATA_ERASURE_REQUESTED',
  'ORGANIZER_APPLICATION_REJECTED',
  'ARTIST_APPLICATION_REJECTED',
]);
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

const AUDIT_FIELD_LABELS: Record<string, string> = {
  role: 'Papel',
  status: 'Status',
  enabled: 'Ativo',
  flag: 'Flag',
  fields: 'Campos alterados',
};

export function auditFieldLabel(field: string): string {
  return AUDIT_FIELD_LABELS[field] ?? field;
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  if (Array.isArray(value) && value.every((v) => typeof v === 'string')) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export type AuditChange =
  | { kind: 'change'; field: string; from: string; to: string }
  | { kind: 'list'; field: string; values: string[] };

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string');
}

// before/after → "campo: de → para". Only fields whose value differs are
// listed. The API never stores PII values here (only field names), so values
// are shown as received.
export function auditChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): AuditChange[] {
  const b = before ?? {};
  const a = after ?? {};
  // No "before" and a list of names (PROFILE_UPDATED: after.fields) is not a
  // value change: it is just which fields were touched.
  const isFieldList = (f: string) => before == null && isStringArray(a[f]);
  const fields = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  return fields
    .filter((f) => formatAuditValue(b[f]) !== formatAuditValue(a[f]))
    .map((f): AuditChange =>
      isFieldList(f)
        ? { kind: 'list', field: f, values: a[f] as string[] }
        : { kind: 'change', field: f, from: formatAuditValue(b[f]), to: formatAuditValue(a[f]) },
    );
}
