'use client';

import Link from 'next/link';
import type { OrganizationResponse } from '../types/organization.types';
import styles from './OrganizationCard.module.scss';

// ── Helpers ───────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = ['#ff5fb4', '#9b7bff', '#46d6d8', '#ff2e9e', '#7fe0a0'];

function avatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Component ─────────────────────────────────────────────────────

interface Props {
  organization: OrganizationResponse;
}

export function OrganizationCard({ organization: org }: Props) {
  const initials = getInitials(org.name);
  const bg = avatarColor(org.id);

  return (
    <Link href={`/dashboard/organizations/${org.id}`} className={styles.card}>
      {/* corner glow */}
      <div className={styles.glow} style={{ background: `radial-gradient(circle, ${bg}28, transparent 70%)` }} />

      {/* identity row */}
      <div className={styles.identity}>
        <div className={styles.logoWrap}>
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className={styles.logo} />
          ) : (
            <div className={styles.logoInitials} style={{ background: `${bg}22`, color: bg }}>
              {initials}
            </div>
          )}
        </div>
        <div className={styles.identityText}>
          <div className={styles.name}>{org.name}</div>
          <div className={styles.handle}>@{org.slug}</div>
        </div>
        <span className={styles.menuBtn} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </span>
      </div>

      {/* description */}
      <p className={styles.description}>
        {org.description ?? 'Sem descrição.'}
      </p>

      {/* stats row */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>EVENTOS</div>
          <div className={styles.statValue}>—</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>EQUIPE</div>
          <div className={styles.statValue}>—</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>VENDAS</div>
          <div className={`${styles.statValue} ${styles.statValuePink}`}>—</div>
        </div>
      </div>

      {/* footer */}
      <div className={styles.footer}>
        <div className={styles.avatarStack}>
          <div
            className={styles.avatar}
            style={{ background: bg, color: '#0a0a0b', marginLeft: 0 }}
          >
            {initials.charAt(0)}
          </div>
        </div>
        <span className={styles.statusBadge}>ATIVO</span>
      </div>
    </Link>
  );
}
