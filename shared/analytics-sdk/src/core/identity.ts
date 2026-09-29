import type { KeyValueStore } from './storage';
import { randomUUID } from './uuid';

export interface SessionState {
  id: string;
  lastActivity: number;
}

const SESSION_IDLE_MS = 30 * 60 * 1000;
const ANON_KEY = 'sho_aid';
const SESSION_ID_KEY = 'sho_sid';
const SESSION_AT_KEY = 'sho_sid_at';

export function nextSession(current: SessionState | null, now: number): SessionState {
  if (current && now - current.lastActivity <= SESSION_IDLE_MS) {
    return { id: current.id, lastActivity: now };
  }
  return { id: randomUUID(), lastActivity: now };
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
}

/** Previously persisted id (cookie -> localStorage), or null. Reading is allowed pre-consent; only writes are gated. */
export function readPersistedAnonymousId(): string | null {
  const fromCookie = readCookie(ANON_KEY);
  if (fromCookie) return fromCookie;
  try {
    return localStorage.getItem(ANON_KEY) || null;
  } catch {
    return null; // storage blocked
  }
}

/** cookie -> localStorage -> new id, per the consent spec's read order on `granted`. */
export function resolveAnonymousId(): string {
  return readPersistedAnonymousId() ?? randomUUID();
}

export function persistAnonymousId(id: string): void {
  writeCookie(ANON_KEY, id);
  try {
    localStorage.setItem(ANON_KEY, id);
  } catch {
    // storage blocked — cookie already carries the id
  }
}

export function loadSession(store: KeyValueStore | null, now: number): SessionState {
  if (store) {
    const id = store.get(SESSION_ID_KEY);
    const at = store.get(SESSION_AT_KEY);
    const lastActivity = at ? Number(at) : NaN;
    if (id && !Number.isNaN(lastActivity)) {
      return nextSession({ id, lastActivity }, now);
    }
  }
  return nextSession(null, now);
}

export function persistSession(store: KeyValueStore | null, session: SessionState): void {
  if (!store) return;
  store.set(SESSION_ID_KEY, session.id);
  store.set(SESSION_AT_KEY, String(session.lastActivity));
}
