'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAuth } from '@/features/account';
import { useOrganizations } from '../hooks/use-organizations';
import { OrganizationCard } from '../components/OrganizationCard';
import styles from './OrganizationListPage.module.scss';

type ChipId = 'todas' | 'minhas' | 'convidadas' | 'arquivadas';

// ── KPI icons ─────────────────────────────────────────────────────

function KpiIcon({ kind }: { kind: 'org' | 'event' | 'team' | 'sales' }) {
  const p = { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };
  if (kind === 'org') return (
    <svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h3M8 11h3M8 15h3M14 7h2M14 11h2M14 15h2" /></svg>
  );
  if (kind === 'event') return (
    <svg {...p}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
  );
  if (kind === 'team') return (
    <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M21 21a5 5 0 0 0-4-4.9" /></svg>
  );
  return (
    <svg {...p}><path d="M3 17l5-5 4 4 8-9" /><path d="M14 7h6v6" /></svg>
  );
}

// ── Main ─────────────────────────────────────────────────────────

export function OrganizationListPage() {
  const { user } = useAuth();
  const { data: orgs = [], isLoading, isError } = useOrganizations();

  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<ChipId>('todas');

  const myOrgs = useMemo(() => orgs.filter((o) => o.ownerId === user?.id), [orgs, user?.id]);
  const invitedOrgs = useMemo(() => orgs.filter((o) => o.ownerId !== user?.id), [orgs, user?.id]);

  const CHIPS: { id: ChipId; label: string; count: number }[] = [
    { id: 'todas', label: 'TODAS', count: orgs.length },
    { id: 'minhas', label: 'MINHAS', count: myOrgs.length },
    { id: 'convidadas', label: 'CONVIDADAS', count: invitedOrgs.length },
    { id: 'arquivadas', label: 'ARQUIVADAS', count: 0 },
  ];

  const filtered = useMemo(() => {
    let list = orgs;
    if (chip === 'minhas') list = myOrgs;
    if (chip === 'convidadas') list = invitedOrgs;
    if (chip === 'arquivadas') list = [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.slug.toLowerCase().includes(q) ||
          (o.description ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [orgs, myOrgs, invitedOrgs, chip, search]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>
            <span>PAINEL</span>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbActive}>ORGANIZAÇÕES</span>
          </div>
          <h1 className={styles.heading}>Organizações</h1>
          <p className={styles.subheading}>Gerencie suas organizações, equipes e permissões</p>
        </div>
        <Link href="/dashboard/organizations/new" className={styles.btnCreate}>
          <Plus size={16} strokeWidth={2.6} />
          Nova Organização
        </Link>
      </div>

      {/* KPI strip */}
      {!isLoading && (
        <div className={styles.kpiStrip}>
          <div className={`${styles.kpiCard} ${styles.kpiCardAccent}`}>
            <div className={styles.kpiGlow} />
            <div className={styles.kpiLabel}><KpiIcon kind="org" /> TOTAL DE ORGS</div>
            <div className={styles.kpiValue}>
              <span className={styles.kpiNum}>{orgs.length}</span>
              <span className={styles.kpiUnit}>ativas</span>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}><KpiIcon kind="event" /> EVENTOS ATIVOS</div>
            <div className={styles.kpiValue}>
              <span className={styles.kpiNum}>—</span>
              <span className={styles.kpiUnit}>em curso</span>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}><KpiIcon kind="team" /> EQUIPE TOTAL</div>
            <div className={styles.kpiValue}>
              <span className={styles.kpiNum}>—</span>
              <span className={styles.kpiUnit}>membros</span>
            </div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiLabel}><KpiIcon kind="sales" /> VENDAS NO MÊS</div>
            <div className={styles.kpiValue}>
              <span className={`${styles.kpiNum} ${styles.kpiNumPink}`}>—</span>
              <span className={styles.kpiUnit}>BRL</span>
            </div>
          </div>
        </div>
      )}

      {/* Search row */}
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7d7d85" strokeWidth="2" className={styles.searchIcon}>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
          </svg>
          <input
            className={styles.searchInput}
            placeholder="Buscar organização, handle ou equipe…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="Limpar">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chips */}
      <div className={styles.chips}>
        {CHIPS.map((c) => (
          <button
            key={c.id}
            onClick={() => setChip(c.id)}
            className={`${styles.chip} ${chip === c.id ? styles.chipActive : styles.chipInactive}`}
          >
            {c.label}
            <span className={chip === c.id ? styles.chipBadgeActive : styles.chipBadgeInactive}>
              {c.count}
            </span>
          </button>
        ))}
      </div>

      {/* States */}
      {isLoading && <p className={styles.state}>Carregando organizações...</p>}
      {isError && <p className={`${styles.state} ${styles.stateError}`}>Erro ao carregar organizações. Tente novamente.</p>}

      {/* Grid */}
      {!isLoading && !isError && (
        <div className={styles.grid}>
          {filtered.map((org) => (
            <OrganizationCard key={org.id} organization={org} />
          ))}
          <Link href="/dashboard/organizations/new" className={styles.createCard}>
            <div className={styles.createCardIcon}>
              <Plus size={22} strokeWidth={2.4} />
            </div>
            <div>
              <div className={styles.createCardTitle}>Criar Organização</div>
              <div className={styles.createCardSub}>Convide sua equipe e comece a vender</div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
