import { createElement, Fragment, useEffect, useRef, type ReactNode } from 'react';
import type { Json } from '@live-show/api-contracts';
import { useAnalytics } from './provider';

/**
 * Tracks running time while active, excluding paused spans and idle spans
 * past `idleMs` since the last `activity()` call. Pure-ish and testable
 * independent of the DOM: callers feed a monotonic clock via `now`.
 */
export class ActiveTimer {
  private readonly now: () => number;
  private readonly idleMs: number;
  private running = false;
  private startedAt = 0;
  private lastActivityAt = 0;
  private accumulated = 0;

  constructor(now: () => number, idleMs = 60_000) {
    this.now = now;
    this.idleMs = idleMs;
  }

  private countedSpan(nowValue: number): number {
    if (!this.running) return 0;
    const idleCutoff = Math.min(nowValue, this.lastActivityAt + this.idleMs);
    return Math.max(0, idleCutoff - this.startedAt);
  }

  start(): void {
    const nowValue = this.now();
    this.startedAt = nowValue;
    this.lastActivityAt = nowValue;
    this.running = true;
  }

  pause(): void {
    this.accumulated += this.countedSpan(this.now());
    this.running = false;
  }

  activity(): void {
    const nowValue = this.now();
    this.accumulated += this.countedSpan(nowValue);
    this.startedAt = nowValue;
    this.lastActivityAt = nowValue;
    this.running = true;
  }

  elapsed(): number {
    return this.accumulated + this.countedSpan(this.now());
  }
}

/**
 * Emits `feature_viewed` on mount and `feature_time` once, on unmount or
 * `pagehide` (whichever comes first). Active time excludes tab-hidden spans
 * and idle spans (no pointer/key/scroll activity) past the default 60s.
 */
export function useFeatureTimer(feature: string, props?: Record<string, Json>): void {
  const analytics = useAnalytics();
  const propsRef = useRef(props);
  propsRef.current = props;

  // Survive a React StrictMode (dev) phantom unmount: it runs this effect's
  // cleanup and then re-runs the effect synchronously, before anything else can
  // observe the gap — without a guard that emits feature_viewed twice plus a
  // spurious near-0ms feature_time in between (same failure mode player_opened/
  // playback_ended guard against in Player.tsx's Stage). Kept across renders via
  // refs so only a real unmount (not the phantom one) lets the timer end.
  const timerRef = useRef<ActiveTimer | null>(null);
  const viewedFiredRef = useRef(false);
  const timeEmittedRef = useRef(false);
  const pendingTimeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFeatureRef = useRef<string | null>(null);

  useEffect(() => {
    // A real feature-name change restarts the timer for the new feature — reset
    // the guards so it tracks as a fresh view instead of being silenced by the
    // previous feature's state.
    if (lastFeatureRef.current !== null && lastFeatureRef.current !== feature) {
      timerRef.current = null;
      viewedFiredRef.current = false;
      timeEmittedRef.current = false;
    }
    lastFeatureRef.current = feature;

    // This mount proves the previous cleanup (if any) was StrictMode's phantom
    // unmount, not a real one — cancel its deferred feature_time.
    if (pendingTimeRef.current !== null) {
      clearTimeout(pendingTimeRef.current);
      pendingTimeRef.current = null;
    }

    if (!timerRef.current) {
      timerRef.current = new ActiveTimer(Date.now);
      timerRef.current.start();
    }
    const timer = timerRef.current;

    if (!viewedFiredRef.current) {
      viewedFiredRef.current = true;
      analytics.trackUntyped('feature_viewed', { ...propsRef.current, feature });
    }

    const emitFeatureTime = (): void => {
      if (timeEmittedRef.current) return;
      timeEmittedRef.current = true;
      analytics.trackUntyped('feature_time', {
        ...propsRef.current,
        feature,
        durationMs: Math.round(timer.elapsed()),
      });
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') timer.pause();
      else timer.start();
    };
    const onActivity = (): void => timer.activity();
    const onPageHide = (): void => {
      emitFeatureTime();
      void analytics.flush({ keepalive: true });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity, { passive: true });
    window.addEventListener('scroll', onActivity, { passive: true });
    window.addEventListener('pagehide', onPageHide);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('pagehide', onPageHide);
      // Deferred: a real unmount lets this fire; a StrictMode phantom unmount is
      // followed SYNCHRONOUSLY by a remount, which cancels it above before the
      // (0ms, but still a macrotask) timeout ever runs.
      pendingTimeRef.current = setTimeout(emitFeatureTime, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- props are read via ref; only a feature-name change restarts the timer
  }, [feature]);
}

export function TrackFeature(p: { name: string; props?: Record<string, Json>; children: ReactNode }): JSX.Element {
  useFeatureTimer(p.name, p.props);
  return createElement(Fragment, null, p.children);
}
