'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, X } from 'lucide-react';
import { platformAdminService } from '../services/platform-admin.service';
import { useImpersonationStore } from './impersonation.store';
import styles from './ImpersonationBanner.module.scss';

// Persistent, app-wide banner shown while a read-only support session is
// active. The admin is browsing AS the target; every mutation is blocked at
// the backend — the banner just makes the state impossible to forget.
export function ImpersonationBanner() {
  const { active, target, expiresAt, finish } = useImpersonationStore();
  const queryClient = useQueryClient();
  const [ending, setEnding] = useState(false);

  async function end() {
    if (!target) return;
    setEnding(true);
    const targetId = target.id;
    finish(); // restore admin token FIRST so the end call is authorized
    try {
      await platformAdminService.endImpersonation(targetId);
    } catch {
      /* audit-only marker; token already restored, session is over regardless */
    }
    queryClient.clear();
    setEnding(false);
  }

  // Auto-end when the short-lived token expires so the banner never lies.
  useEffect(() => {
    if (!active || !expiresAt) return;
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      void end();
      return;
    }
    const t = setTimeout(() => void end(), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, expiresAt]);

  if (!active || !target) return null;

  return (
    <div className={styles.banner} role="status">
      <Eye size={15} className={styles.icon} />
      <span className={styles.text}>
        Sessão de suporte <b>somente leitura</b> — visualizando como{' '}
        <b>{target.displayName}</b> ({target.email}). Escrita bloqueada.
      </span>
      <span className={styles.roPill}>READ-ONLY</span>
      <button type="button" className={styles.endBtn} onClick={() => void end()} disabled={ending}>
        <X size={13} />
        {ending ? 'Encerrando…' : 'Encerrar'}
      </button>
    </div>
  );
}
