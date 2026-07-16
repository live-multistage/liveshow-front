import { create } from 'zustand';
import { tokenStore } from '@/lib/auth/token-store';
import type { AuthUser } from '@/features/account';

export interface ImpersonationTarget {
  id: string;
  email: string;
  displayName: string;
}

interface ImpersonationState {
  active: boolean;
  target: ImpersonationTarget | null;
  expiresAt: string | null;
  // The real super-admin token + identity, stashed while the read-only token
  // and the target identity are active, so "encerrar" can fully restore them.
  adminToken: string | null;
  adminUser: AuthUser | null;
  begin: (token: string, target: ImpersonationTarget, expiresAt: string, adminUser: AuthUser | null) => void;
  finish: () => void;
}

// In-memory only. A full page reload drops the impersonation token and the
// tokenStore falls back to the admin session cookie — the support session
// fails closed to the admin's own identity, which is safe.
export const useImpersonationStore = create<ImpersonationState>((set, get) => ({
  active: false,
  target: null,
  expiresAt: null,
  adminToken: null,
  adminUser: null,
  begin: (token, target, expiresAt, adminUser) => {
    set({ active: true, target, expiresAt, adminToken: tokenStore.get(), adminUser });
    tokenStore.set(token); // subsequent requests now carry the read-only token
  },
  finish: () => {
    tokenStore.set(get().adminToken); // restore the real super-admin token
    set({ active: false, target: null, expiresAt: null, adminToken: null, adminUser: null });
  },
}));
