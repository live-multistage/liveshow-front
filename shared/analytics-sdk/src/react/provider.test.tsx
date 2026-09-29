import { describe, it, expect, vi } from 'vitest';
import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { AnalyticsProvider, TrackFeature } from './index';

const opts = (send: any) => ({ writeKey: 'wk', endpoint: 'e', transport: { send }, flushAt: 1 });
const events = (send: any) => send.mock.calls.flatMap((c: any) => c[0].batch).map((m: any) => m.type === 'track' ? m.event : m.type);

describe('AnalyticsProvider', () => {
  it('emits page on mount and on path change', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const { rerender } = render(<AnalyticsProvider options={opts(send)} consent="granted" pathname="/" search=""><div /></AnalyticsProvider>);
    rerender(<AnalyticsProvider options={opts(send)} consent="granted" pathname="/events" search=""><div /></AnalyticsProvider>);
    await new Promise((r) => setTimeout(r, 0));
    expect(events(send).filter((e: string) => e === 'page')).toHaveLength(2);
  });
  it('emits one page per distinct path while consent resolves undefined→null→granted', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const o = opts(send);
    const ui = (consent: 'granted' | null, pathname: string) => (
      <AnalyticsProvider options={o} consent={consent} pathname={pathname} search="?q=1"><div /></AnalyticsProvider>
    );
    const { rerender } = render(<StrictMode>{ui(null, '/')}</StrictMode>);
    rerender(<StrictMode>{ui(null, '/')}</StrictMode>);
    rerender(<StrictMode>{ui('granted', '/')}</StrictMode>);
    await new Promise((r) => setTimeout(r, 0));
    expect(events(send).filter((e: string) => e === 'page')).toHaveLength(1);
    rerender(<StrictMode>{ui('granted', '/events')}</StrictMode>);
    await new Promise((r) => setTimeout(r, 0));
    expect(events(send).filter((e: string) => e === 'page')).toHaveLength(2);
  });
  it('TrackFeature emits feature_viewed then feature_time on unmount', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const { unmount } = render(<AnalyticsProvider options={opts(send)} consent="granted" pathname="/" search=""><TrackFeature name="player"><div /></TrackFeature></AnalyticsProvider>);
    unmount(); await new Promise((r) => setTimeout(r, 0));
    expect(events(send)).toEqual(expect.arrayContaining(['feature_viewed', 'feature_time']));
  });
});
