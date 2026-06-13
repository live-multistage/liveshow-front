'use client';

import { Building2, Settings, Users, Globe } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import type { OrganizationResponse } from '../types/organization.types';
import styles from './OrganizationHeader.module.scss';

interface Props {
  organization: OrganizationResponse;
}

const NAV_ITEMS = [
  { label: 'Visão Geral', href: '', icon: Building2 },
  { label: 'Membros', href: '/members', icon: Users },
  { label: 'Configurações', href: '/settings', icon: Settings },
  { label: 'Perfil Público', href: '/public', icon: Globe },
];

export function OrganizationHeader({ organization }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const base = `/dashboard/organizations/${organization.id}`;

  return (
    <div className={styles.header}>
      <div className={styles.top}>
        <div className={styles.identity}>
          <div className={styles.avatar}>
            {organization.logoUrl ? (
              <img src={organization.logoUrl} alt={organization.name} className={styles.logo} />
            ) : (
              <Building2 size={28} />
            )}
          </div>
          <div>
            <h1 className={styles.name}>{organization.name}</h1>
            <p className={styles.slug}>@{organization.slug}</p>
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const to = `${base}${href}`;
          const active = pathname === to;
          return (
            <button
              key={href}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
              onClick={() => router.push(to)}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
