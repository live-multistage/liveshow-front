import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { render, cleanup } from '@testing-library/react';
import { ActiveTimer, TrackFeature } from './feature-timer';
import * as providerModule from './provider';

describe('ActiveTimer', () => {
  it('counts running time, excludes paused time', () => {
    let t = 0; const timer = new ActiveTimer(() => t);
    timer.start(); t = 1000; timer.pause(); t = 5000; timer.start(); t = 6000;
    expect(timer.elapsed()).toBe(2000);
  });
  it('stops counting after idle threshold until activity', () => {
    let t = 0; const timer = new ActiveTimer(() => t, 60_000);
    timer.start(); t = 90_000;                 // idle since 0 → counts only 60s
    expect(timer.elapsed()).toBe(60_000);
    timer.activity(); t = 100_000;             // resumes at 90s
    expect(timer.elapsed()).toBe(70_000);
  });
});

describe('useFeatureTimer via TrackFeature', () => {
  afterEach(() => cleanup());

  it('does not let a `feature` or `durationMs` prop override the tracked values', () => {
    const trackUntyped = vi.fn();
    vi.spyOn(providerModule, 'useAnalytics').mockReturnValue({
      trackUntyped,
      flush: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof providerModule.useAnalytics>);

    const { unmount } = render(
      createElement(TrackFeature, {
        name: 'checkout',
        props: { feature: 'spoofed', durationMs: -1 },
        children: null,
      }),
    );

    expect(trackUntyped).toHaveBeenCalledWith('feature_viewed', expect.objectContaining({ feature: 'checkout' }));

    unmount();

    const [, timeProps] = trackUntyped.mock.calls.find(([eventName]) => eventName === 'feature_time')!;
    expect(timeProps.feature).toBe('checkout');
    expect(typeof timeProps.durationMs).toBe('number');
  });
});
