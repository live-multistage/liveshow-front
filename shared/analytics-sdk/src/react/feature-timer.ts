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

  useEffect(() => {
    const timer = new ActiveTimer(Date.now);
    timer.start();
    analytics.trackUntyped('feature_viewed', { ...propsRef.current, feature });

    let emitted = false;
    const emitFeatureTime = (): void => {
      if (emitted) return;
      emitted = true;
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
      emitFeatureTime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- props are read via ref; only a feature-name change restarts the timer
  }, [feature]);
}

export function TrackFeature(p: { name: string; props?: Record<string, Json>; children: ReactNode }): JSX.Element {
  useFeatureTimer(p.name, p.props);
  return createElement(Fragment, null, p.children);
}
