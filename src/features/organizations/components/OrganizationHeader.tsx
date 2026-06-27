'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useOrganizationMembers } from '../hooks/use-organization-members';
import { useOrganizationEvents } from '../hooks/use-organizations';
import { useOrganizationSettings } from '../hooks/use-organization-settings';
import type { OrganizationResponse } from '../types/organization.types';
import styles from './OrganizationHeader.module.scss';

// ── Helpers ───────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

const AVATAR_COLORS = ['#ff5fb4', '#9b7bff', '#46d6d8', '#ff2e9e', '#7fe0a0'];
function avatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Tab icons ─────────────────────────────────────────────────────

function TabIcon({ kind }: { kind: string }) {
  const p = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none' as const, stroke: 'currentColor', strokeWidth: 2 };
  switch (kind) {
    case 'visao':     return <svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h3M8 11h3M8 15h3M14 7h2M14 11h2M14 15h2" /></svg>;
    case 'eventos':   return <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>;
    case 'membros':   return <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 21a5 5 0 0 0-4-4.9" /></svg>;
    case 'analytics': return <svg {...p}><path d="M5 21V10M12 21V4M19 21v-7" /></svg>;
    case 'config':    return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>;
    case 'perfil':    return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></svg>;
    default:          return null;
  }
}

// ── Tabs config ───────────────────────────────────────────────────

const TABS = [
  { id: 'visao',     label: 'Visão Geral',    href: '',          badge: null as 'events' | 'members' | null },
  { id: 'eventos',   label: 'Eventos',         href: '/eventos',  badge: 'events' as const },
  { id: 'membros',   label: 'Membros',         href: '/members',  badge: 'members' as const },
  { id: 'analytics', label: 'Análises',        href: '/analytics', badge: null },
  { id: 'config',   label: 'Configurações',   href: '/settings', badge: null },
  { id: 'perfil',   label: 'Perfil Público',  href: '/public',   badge: null },
];

// ── Component ─────────────────────────────────────────────────────

interface Props {
  organization: OrganizationResponse;
}

export function OrganizationHeader({ organization: org }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const base     = `/dashboard/organizations/${org.id}`;

  const { data: members = [] }  = useOrganizationMembers(org.id);
  const { data: allEvents = [] } = useOrganizationEvents(org.id, 'all');
  const { data: settings }      = useOrganizationSettings(org.id);

  const bannerUrl  = org.bannerUrl ?? settings?.bannerUrl ?? null;
  const logoUrl    = org.logoUrl   ?? settings?.logoUrl   ?? null;
  const logoColor  = avatarColor(org.id);
  const initials   = getInitials(org.name);
  const foundedYear = new Date(org.createdAt).getFullYear();
  const city       = settings?.city;
  const country    = settings?.country;
  const location   = [city, country].filter(Boolean).join(', ');

  const badgeCounts: Record<string, number> = {
    events: allEvents.length,
    members: members.length,
  };

  return (
    <div className={styles.hero}>
      {/* Banner */}
      <div
        className={styles.banner}
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {!bannerUrl && <div className={styles.bannerGrid} />}
      </div>

      {/* Identity row — overlaps banner */}
      <div className={styles.identityRow}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          {logoUrl ? (
            <img src={logoUrl} alt={org.name} className={styles.logo} />
          ) : (
            <div className={styles.logoInitials} style={{ background: `${logoColor}22`, color: logoColor }}>
              {initials}
            </div>
          )}
        </div>

        {/* Name + meta */}
        <div className={styles.meta}>
          <div className={styles.nameRow}>
            <h1 className={styles.name}>{org.name}</h1>
          </div>
          <div className={styles.metaRow}>
            <span>@{org.slug}</span>
            <span className={styles.dot}>·</span>
            <span>Fundada em {foundedYear}</span>
            {location && (
              <>
                <span className={styles.dot}>·</span>
                <span>{location}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.btnGhost}
            onClick={() => router.push(`/organizations/${org.slug}`)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
            </svg>
            VER PERFIL PÚBLICO
          </button>
          <button className={styles.btnPrimary}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            NOVO EVENTO
          </button>
          <button className={styles.btnIcon} aria-label="Mais opções">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((tab) => {
          const to     = `${base}${tab.href}`;
          const active = tab.href === '' ? pathname === base : pathname.startsWith(to);
          const count  = tab.badge ? badgeCounts[tab.badge] : null;

          return (
            <button
              key={tab.id}
              className={`${styles.tab} ${active ? styles.tabActive : styles.tabInactive}`}
              onClick={() => router.push(to)}
            >
              <TabIcon kind={tab.id} />
              {tab.label}
              {count !== null && count > 0 && (
                <span className={active ? styles.tabBadgeActive : styles.tabBadgeInactive}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
