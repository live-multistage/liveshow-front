import { create } from 'zustand';
import { tokenStore } from '@/lib/auth/token-store';

export interface ImpersonationTarget {
  id: string;
  email: string;
  displayName: string;
}

interface ImpersonationState {
  active: boolean;
  target: ImpersonationTarget | null;
  expiresAt: string | null;
  // The real super-admin token, stashed while the impersonation token is the
  // active one, so "encerrar" can restore the true identity.
  adminToken: string | null;
  begin: (token: string, target: ImpersonationTarget, expiresAt: string) => void;
  finish: () => void;
}

// In-memory only. A full page reload drops the impersonation token and the
// tokenStore falls back to the admin session cookie — the support session
// fails closed to the admin's own (read-only-nothing) identity, which is safe.
export const useImpersonationStore = create<ImpersonationState>((set, get) => ({
  active: false,
  target: null,
  expiresAt: null,
  adminToken: null,
  begin: (token, target, expiresAt) => {
    set({ active: true, target, expiresAt, adminToken: tokenStore.get() });
    tokenStore.set(token); // subsequent requests now carry the read-only token
  },
  finish: () => {
    tokenStore.set(get().adminToken); // restore the real super-admin token
    set({ active: false, target: null, expiresAt: null, adminToken: null });
  },
}));
