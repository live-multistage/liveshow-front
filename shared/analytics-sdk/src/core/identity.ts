import type { KeyValueStore } from './storage';
import { randomUUID } from './uuid';

export interface SessionState {
  id: string;
  lastActivity: number;
}

const SESSION_IDLE_MS = 30 * 60 * 1000;
const ANON_KEY = 'sho_aid';
const IDENTIFIED_USER_KEY = 'sho_uid';
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

/** Denied consent: drop the persisted anonymous id (cookie + localStorage) and session. */
export function clearPersistedIdentity(store: KeyValueStore): void {
  if (typeof document !== 'undefined') document.cookie = `${ANON_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
  try {
    localStorage.removeItem(ANON_KEY);
  } catch {
    // storage blocked — nothing was persisted there
  }
  store.remove(SESSION_ID_KEY);
  store.remove(SESSION_AT_KEY);
  clearPersistedIdentifiedUserId();
}

/** Last userId identify() sent in this browser, or null. Reading is allowed pre-consent; only writes are gated. */
export function readPersistedIdentifiedUserId(): string | null {
  const fromCookie = readCookie(IDENTIFIED_USER_KEY);
  if (fromCookie) return fromCookie;
  try {
    return localStorage.getItem(IDENTIFIED_USER_KEY) || null;
  } catch {
    return null; // storage blocked
  }
}

export function persistIdentifiedUserId(userId: string): void {
  writeCookie(IDENTIFIED_USER_KEY, userId);
  try {
    localStorage.setItem(IDENTIFIED_USER_KEY, userId);
  } catch {
    // storage blocked — cookie already carries the id
  }
}

export function clearPersistedIdentifiedUserId(): void {
  if (typeof document !== 'undefined') document.cookie = `${IDENTIFIED_USER_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
  try {
    localStorage.removeItem(IDENTIFIED_USER_KEY);
  } catch {
    // storage blocked — nothing was persisted there
  }
}

export function persistAnonymousId(id: string): void {
  writeCookie(ANON_KEY, id);
  try {
    localStorage.setItem(ANON_KEY, id);
  } catch {
    // storage blocked — cookie already carries the id
  }
}

/** The persisted session if it hasn't idled out, touched to `now`; null otherwise. */
export function readFreshSession(store: KeyValueStore | null, now: number): SessionState | null {
  if (!store) return null;
  const id = store.get(SESSION_ID_KEY);
  const at = store.get(SESSION_AT_KEY);
  const lastActivity = at ? Number(at) : NaN;
  if (!id || Number.isNaN(lastActivity) || now - lastActivity > SESSION_IDLE_MS) return null;
  return { id, lastActivity: now };
}

export function loadSession(store: KeyValueStore | null, now: number): SessionState {
  return readFreshSession(store, now) ?? nextSession(null, now);
}

export function persistSession(store: KeyValueStore | null, session: SessionState): void {
  if (!store) return;
  store.set(SESSION_ID_KEY, session.id);
  store.set(SESSION_AT_KEY, String(session.lastActivity));
}
