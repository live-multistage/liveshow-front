// Offline QR validation for the gate device (F2 requirement: check-in must
// not depend on connectivity). The page caches the server's ECDSA P-256
// public key while online; without network we verify the QR token's
// signature locally, keep a local redeemed-set, and queue redemptions to
// sync when the connection returns.
//
// Inherent limit (documented in the spec): offline, a duplicate is only
// caught if THIS device saw the first scan; cross-device dupes reconcile
// when the queue syncs. The 6-char manual code cannot be validated offline
// (code→grant mapping is server-side).

const PK_STORAGE = 'entry-pass-public-key';
const REDEEMED_STORAGE = 'entry-pass-offline-redeemed';
const QUEUE_STORAGE = 'entry-pass-offline-queue';

export interface QrTokenPayload {
  gid: string;
  eid: string;
  iat: number;
}

export function cachePublicKey(pem: string): void {
  localStorage.setItem(PK_STORAGE, pem);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

export function parseQrToken(token: string): { payload: QrTokenPayload; raw: string; sig: string } | null {
  const [raw, sig] = token.split('.');
  if (!raw || !sig) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(raw))) as QrTokenPayload;
    if (!payload.gid || !payload.eid) return null;
    return { payload, raw, sig };
  } catch {
    return null;
  }
}

// Signature check against the cached public key. false = forged/unknown key.
export async function verifyQrTokenOffline(token: string): Promise<QrTokenPayload | null> {
  const pem = localStorage.getItem(PK_STORAGE);
  const parsed = parseQrToken(token);
  if (!pem || !parsed) return null;

  const key = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(pem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    b64urlToBytes(parsed.sig),
    new TextEncoder().encode(parsed.raw),
  );
  return ok ? parsed.payload : null;
}

// ── Local redeemed-set + sync queue ──────────────────────────────

function readSet(key: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function isLocallyRedeemed(grantId: string): boolean {
  return readSet(REDEEMED_STORAGE).includes(grantId);
}

export function markLocallyRedeemed(grantId: string): void {
  const set = readSet(REDEEMED_STORAGE);
  if (!set.includes(grantId)) {
    set.push(grantId);
    localStorage.setItem(REDEEMED_STORAGE, JSON.stringify(set));
  }
  const queue = readSet(QUEUE_STORAGE);
  if (!queue.includes(grantId)) {
    queue.push(grantId);
    localStorage.setItem(QUEUE_STORAGE, JSON.stringify(queue));
  }
}

// Push queued offline redemptions to the server; keeps whatever still fails.
export async function flushOfflineQueue(
  send: (grantId: string) => Promise<unknown>,
): Promise<void> {
  const queue = readSet(QUEUE_STORAGE);
  const remaining: string[] = [];
  for (const grantId of queue) {
    try {
      await send(grantId);
    } catch {
      remaining.push(grantId);
    }
  }
  localStorage.setItem(QUEUE_STORAGE, JSON.stringify(remaining));
}
