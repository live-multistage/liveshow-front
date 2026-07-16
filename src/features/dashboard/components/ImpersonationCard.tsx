'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert, Search, Eye } from 'lucide-react';
import { platformAdminService } from '@/features/platform-admin/services/platform-admin.service';
import { useImpersonationStore } from '@/features/platform-admin/impersonation/impersonation.store';
import { useAuth } from '@/features/account';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { AuthUser } from '@/features/account';
import type { PlatformUserResult, ImpersonationSession } from '@/features/platform-admin/types/platform-admin.types';
import styles from './SuperAdminDashboard.module.scss';

// Governance idea 13: start a READ-ONLY support session. Search a user → begin
// impersonation. The backend refuses to impersonate another super-admin and
// blocks every mutation for the read-only token; this card only opens the door.
export function ImpersonationCard() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlatformUserResult[]>([]);
  const begin = useImpersonationStore((s) => s.begin);
  const { user, login } = useAuth();
  const queryClient = useQueryClient();

  const search = useMutation<PlatformUserResult[], AppError, string>({
    mutationFn: async (q) => {
      try {
        return await platformAdminService.searchUsers(q);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: setResults,
  });

  const start = useMutation<ImpersonationSession, AppError, string>({
    mutationFn: async (userId) => {
      try {
        return await platformAdminService.startImpersonation(userId);
      } catch (err) {
        throw normalizeError(err);
      }
    },
    onSuccess: (session) => {
      // Swap the active token AND the in-context identity to the target, then
      // wipe cached queries so every role/capability check and the dashboard
      // shell re-resolve as the target (organizer/admin default view).
      begin(session.token, session.jti, session.target, session.expiresAt, user);
      const targetUser: AuthUser = {
        id: session.target.id,
        email: session.target.email,
        displayName: session.target.displayName,
        role: session.target.role as AuthUser['role'],
      };
      login(targetUser);
      queryClient.clear();
      setQuery('');
      setResults([]);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length >= 2) search.mutate(query.trim());
  }

  return (
    <div className={`${styles.finCard} ${styles.sensitiveCard}`}>
      <div className={styles.finHeader}>
        <div>
          <div className={`${styles.finEyebrow} ${styles.sensitiveEyebrow}`}>
            <ShieldAlert size={12} /> GOVERNANÇA · SENSÍVEL
          </div>
          <div className={styles.finTitle}>Impersonar (somente leitura)</div>
        </div>
      </div>

      <p className={styles.sensitiveNote}>
        Abre uma sessão de suporte <b>read-only</b> para ver a plataforma como o usuário.
        Escrita é bloqueada no backend; início e fim são auditados.
      </p>

      <form className={styles.impSearchRow} onSubmit={submit}>
        <div className={styles.impInputWrap}>
          <Search size={14} className={styles.impSearchIcon} />
          <input
            className={styles.impInput}
            placeholder="Buscar por nome ou e-mail…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className={styles.impSearchBtn} disabled={search.isPending || query.trim().length < 2}>
          {search.isPending ? '…' : 'Buscar'}
        </button>
      </form>

      {start.isError && <div className={styles.impError}>{start.error.message}</div>}

      <div className={styles.impResults}>
        {search.isSuccess && results.length === 0 && (
          <div className={styles.balEmpty}>Nenhum usuário encontrado.</div>
        )}
        {results.map((u) => (
          <div key={u.id} className={styles.impResultRow}>
            <span className={styles.impResultInfo}>
              <span className={styles.impResultName}>{u.displayName}</span>
              <span className={styles.impResultMeta}>
                {u.email} · {u.role}
              </span>
            </span>
            <button
              type="button"
              className={styles.impStartBtn}
              onClick={() => start.mutate(u.id)}
              disabled={start.isPending || u.role === 'SUPER_ADMIN'}
              title={u.role === 'SUPER_ADMIN' ? 'Não é possível impersonar um super-admin' : undefined}
            >
              <Eye size={12} />
              Ver como
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
