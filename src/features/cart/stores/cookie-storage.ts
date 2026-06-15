import type { StateStorage } from 'zustand/middleware';

// Cookie-backed storage for the cart so it is readable server-side (the cart page
// reads it via next/headers and SSRs the items, avoiding the localStorage hydration
// layout shift). Cart payloads are tiny (a few events), well under the ~4KB limit.
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export const cookieStorage: StateStorage = {
  getItem: (name) => readCookie(name),
  setItem: (name, value) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
  },
  removeItem: (name) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
  },
};
