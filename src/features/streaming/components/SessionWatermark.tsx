'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/features/account';
import { getSessionId } from '@/lib/analytics/session-id';
import styles from './SessionWatermark.module.scss';

// How often the mark jumps to a new spot. Moving it defeats static cropping /
// masking of a fixed corner; the interval is short enough that any recording
// of meaningful length contains the mark in several positions.
const MOVE_INTERVAL_MS = 25_000;

function randomPosition() {
  // Keep away from the extreme edges (player chrome) and roam the whole frame.
  return {
    top: `${10 + Math.random() * 70}%`,
    left: `${8 + Math.random() * 70}%`,
  };
}

// Forensic-style session watermark: a faint, moving overlay carrying the
// viewer's identity (email or user id) plus a session fragment. It does not
// prevent screen recording — it deters it and identifies the leaking session
// when a recording surfaces. pointer-events: none, so playback UX is
// untouched.
// ponytail: client-side overlay only — removable via devtools by a determined
// user. Upgrade path if leaks become a real problem: server-side burned-in
// watermark per transcode session, or DRM.
export function SessionWatermark() {
  const { user } = useAuth();
  const [pos, setPos] = useState(randomPosition);
  const [session, setSession] = useState('');

  // sessionStorage is browser-only — read it after mount to keep SSR markup
  // deterministic.
  useEffect(() => {
    setSession(getSessionId().slice(0, 8));
    const interval = setInterval(() => setPos(randomPosition()), MOVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const identity = user?.email ?? user?.id ?? null;
  if (!identity && !session) return null;

  return (
    <div className={styles.watermark} style={pos} aria-hidden="true">
      {identity ?? 'visitante'} · {session}
    </div>
  );
}
