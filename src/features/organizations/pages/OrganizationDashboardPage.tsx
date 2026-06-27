'use client';

import { useRouter } from 'next/navigation';
import { OrganizationHeader } from '../components/OrganizationHeader';
import { useOrganization } from '../hooks/use-organizations';
import { useOrganizationMembers } from '../hooks/use-organization-members';
import { useOrganizationEvents } from '../hooks/use-organizations';
import { useOrganizationSettings } from '../hooks/use-organization-settings';
import type { OrganizationMemberResponse } from '../types/organization.types';
import type { EventResponse, EventStatus } from '@/features/events/types/event.types';
import styles from './OrganizationDashboardPage.module.scss';

// ── Helpers ───────────────────────────────────────────────────────

const AVATAR_COLORS = ['#ff5fb4', '#9b7bff', '#46d6d8', '#ff2e9e', '#7fe0a0'];
function avatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return (name ?? '').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

function rolePtBr(role: string): string {
  const map: Record<string, string> = {
    OWNER: 'Proprietário',
    ADMIN: 'Administrador',
    EVENT_MANAGER: 'Produtor',
    CONTENT_MANAGER: 'Gestor de Conteúdo',
    OPERATOR: 'Operador',
    VIEWER: 'Visualizador',
  };
  return map[role] ?? role;
}

const MONTHS_PT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

function parseEventDate(iso: string) {
  const d = new Date(iso);
  return { month: MONTHS_PT[d.getMonth()]!, day: String(d.getDate()).padStart(2, '0') };
}

function eventStatusBadge(status: EventStatus) {
  switch (status) {
    case 'LIVE':      return { label: 'AO VIVO', live: true };
    case 'PUBLISHED':
    case 'SCHEDULED': return { label: 'PUBLICADO', color: '#7fe0a0', bg: 'rgba(127,224,160,.08)', border: 'rgba(127,224,160,.32)' };
    case 'DRAFT':     return { label: 'RASCUNHO', color: '#c7c7cd', bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.12)' };
    case 'FINISHED':  return { label: 'ENCERRADO', color: '#8f8f97', bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.1)' };
    case 'CANCELLED': return { label: 'CANCELADO', color: '#f87171', bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.2)' };
    default:          return { label: status, color: '#8f8f97', bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.1)' };
  }
}

// ── KPI icon ──────────────────────────────────────────────────────

function KpiIcon({ kind }: { kind: string }) {
  const p = { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2 };
  switch (kind) {
    case 'event':   return <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>;
    case 'team':    return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 21a5 5 0 0 0-4-4.9" /></svg>;
    case 'ticket':  return <svg {...p}><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" /></svg>;
    case 'sales':   return <svg {...p}><path d="M3 17l5-5 4 4 8-9" /><path d="M14 7h6v6" /></svg>;
    default:        return null;
  }
}

// ── Sub-components ────────────────────────────────────────────────

function KpiCard({
  label, value, unit, kind, accent,
}: {
  label: string; value: string | number; unit: string; kind: string; accent?: boolean;
}) {
  return (
    <div className={`${styles.kpiCard} ${accent ? styles.kpiCardAccent : ''}`}>
      {accent && <div className={styles.kpiGlow} />}
      <div className={styles.kpiLabel}><KpiIcon kind={kind} /> {label}</div>
      <div className={styles.kpiValue}>
        <span className={`${styles.kpiNum} ${accent ? styles.kpiNumPink : ''}`}>{value}</span>
        <span className={styles.kpiUnit}>{unit}</span>
      </div>
    </div>
  );
}

function SectionHeader({ label, icon, action }: { label: string; icon: string; action?: React.ReactNode }) {
  const p = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none' as const, stroke: '#ff5fb4', strokeWidth: 2 };
  const svg = icon === 'info'
    ? <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>
    : icon === 'calendar'
    ? <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
    : icon === 'team'
    ? <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 21a5 5 0 0 0-4-4.9" /></svg>
    : <svg {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>;

  return (
    <div className={styles.sectionHeaderRow}>
      <div className={styles.sectionHeaderTitle}>{svg}{label}</div>
      {action}
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────

function EventRow({ event }: { event: EventResponse }) {
  const { month, day } = parseEventDate(event.startsAt);
  const badge = eventStatusBadge(event.status);
  const time = new Date(event.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const venue = [event.venue, event.city].filter(Boolean).join(', ') || '—';

  return (
    <div className={styles.eventRow}>
      <div className={styles.eventDateBox}>
        <div className={styles.eventMonth}>{month}</div>
        <div className={styles.eventDay}>{day}</div>
      </div>
      <div className={styles.eventInfo}>
        <div className={styles.eventTitle}>{event.title}</div>
        <div className={styles.eventMeta}>
          <span>{time} BRT</span>
          <span className={styles.midDot}>·</span>
          <span>{venue}</span>
        </div>
      </div>
      <div className={styles.eventSold}>
        <div className={styles.eventSoldNum}>—</div>
        <div className={styles.eventSoldLabel}>VENDIDOS</div>
      </div>
      {badge.live ? (
        <span className={styles.livePill}>
          <span className={styles.liveDot} />
          LIVE
        </span>
      ) : (
        <span
          className={styles.statusPill}
          style={{ color: badge.color, background: badge.bg, borderColor: badge.border }}
        >
          {badge.label}
        </span>
      )}
    </div>
  );
}

// ── Member row ────────────────────────────────────────────────────

function MemberRow({ member, isYou }: { member: OrganizationMemberResponse; isYou: boolean }) {
  const name     = member.displayName ?? member.email ?? 'Membro';
  const initials = getInitials(name);
  const bg       = avatarColor(member.userId);

  return (
    <div className={styles.memberRow}>
      <div className={styles.memberAvatar} style={{ background: bg, color: '#0a0a0b' }}>
        {initials}
      </div>
      <div className={styles.memberInfo}>
        <div className={styles.memberName}>{name}</div>
        <div className={styles.memberRole}>{rolePtBr(member.role)}</div>
      </div>
      {isYou && <span className={styles.youBadge}>VOCÊ</span>}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────

interface Props {
  organizationId: string;
}

export function OrganizationDashboardPage({ organizationId }: Props) {
  const router = useRouter();

  const { data: org,      isLoading: orgLoading,     isError: orgError  } = useOrganization(organizationId);
  const { data: members = [],                                            } = useOrganizationMembers(organizationId);
  const { data: events  = [], isLoading: eventsLoading                   } = useOrganizationEvents(organizationId, 'all');
  const { data: settings                                                 } = useOrganizationSettings(organizationId);

  if (orgLoading) return <p className={styles.state}>Carregando...</p>;
  if (orgError || !org) return <p className={`${styles.state} ${styles.stateError}`}>Organização não encontrada.</p>;

  const foundedDate = new Date(org.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const location    = [settings?.city, settings?.country].filter(Boolean).join(', ') || null;
  const upcomingEvents = events
    .filter((e) => e.status === 'LIVE' || e.status === 'PUBLISHED' || e.status === 'SCHEDULED' || e.status === 'DRAFT')
    .slice(0, 5);

  return (
    <div className={styles.page}>
      <OrganizationHeader organization={org} />

      {/* Content grid */}
      <div className={styles.grid}>

        {/* Left */}
        <div className={styles.left}>

          {/* KPI strip */}
          <div className={styles.kpiStrip}>
            <KpiCard label="EVENTOS"   value={events.length}   unit="total"    kind="event" />
            <KpiCard label="MEMBROS"   value={members.length}  unit="na equipe" kind="team" />
            <KpiCard label="INGRESSOS" value="—"               unit="vendidos"  kind="ticket" />
            <KpiCard label="RECEITA"   value="—"               unit="BRL"       kind="sales" accent />
          </div>

          {/* About */}
          <div className={styles.card}>
            <SectionHeader
              label="SOBRE A ORGANIZAÇÃO"
              icon="info"
              action={
                <button
                  className={styles.editBtn}
                  onClick={() => router.push(`/dashboard/organizations/${organizationId}/settings`)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  EDITAR
                </button>
              }
            />
            <p className={styles.description}>{org.description || 'Sem descrição.'}</p>
            <div className={styles.aboutGrid}>
              <div>
                <div className={styles.aboutLabel}>FUNDAÇÃO</div>
                <div className={styles.aboutValue}>{foundedDate}</div>
              </div>
              <div>
                <div className={styles.aboutLabel}>SEDE</div>
                <div className={styles.aboutValue}>{location ?? '—'}</div>
              </div>
            </div>
          </div>

          {/* Upcoming events */}
          <div className={styles.card}>
            <SectionHeader
              label="PRÓXIMOS EVENTOS"
              icon="calendar"
              action={
                <a
                  className={styles.seeAllLink}
                  onClick={() => router.push(`/dashboard/organizations/${organizationId}/eventos`)}
                >
                  VER TODOS →
                </a>
              }
            />
            {eventsLoading && <p className={styles.muted}>Carregando eventos...</p>}
            {!eventsLoading && upcomingEvents.length === 0 && (
              <p className={styles.muted}>Nenhum evento cadastrado.</p>
            )}
            <div className={styles.eventList}>
              {upcomingEvents.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className={styles.right}>

          {/* Team */}
          <div className={styles.card}>
            <SectionHeader
              label="EQUIPE"
              icon="team"
              action={
                <button
                  className={styles.inviteBtn}
                  onClick={() => router.push(`/dashboard/organizations/${organizationId}/members`)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  CONVIDAR
                </button>
              }
            />
            <div className={styles.memberList}>
              {members.slice(0, 6).map((m) => (
                <MemberRow key={m.id} member={m} isYou={false} />
              ))}
              {members.length === 0 && <p className={styles.muted}>Nenhum membro ainda.</p>}
            </div>
          </div>

          {/* Activity */}
          <div className={styles.card}>
            <SectionHeader label="ATIVIDADE RECENTE" icon="activity" />
            <p className={styles.muted}>Nenhuma atividade registrada.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
