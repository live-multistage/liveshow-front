import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { AnalyticsProvider, TrackFeature, useAnalytics, useAnalyticsIdentity } from './index';

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

describe('UTM capture is consent-gated', () => {
  beforeEach(() => sessionStorage.clear());
  const ui = (send: any, consent: 'granted' | 'denied' | null) => (
    <AnalyticsProvider options={opts(send)} consent={consent} pathname="/" search="utm_source=mail&utm_medium=email"><div /></AnalyticsProvider>
  );

  it('keeps utm in memory under null and persists it only once granted', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const { rerender } = render(ui(send, null));
    expect(sessionStorage.getItem('sho_utm')).toBeNull();
    rerender(ui(send, 'granted'));
    await new Promise((r) => setTimeout(r, 0));
    expect(JSON.parse(sessionStorage.getItem('sho_utm')!)).toEqual({ source: 'mail', medium: 'email' });
    const [page] = send.mock.calls.flatMap((c: any) => c[0].batch);
    expect(page.context.campaign).toEqual({ source: 'mail', medium: 'email' });
  });

  it('clears a stored utm on denied', () => {
    sessionStorage.setItem('sho_utm', JSON.stringify({ source: 'old' }));
    render(ui(vi.fn(), 'denied'));
    expect(sessionStorage.getItem('sho_utm')).toBeNull();
  });
});

describe('useAnalytics without a provider', () => {
  function NoProviderCaller() {
    const analytics = useAnalytics();
    analytics.track('feature_viewed' as any, {} as any);
    return null;
  }

  it('does not throw and is a no-op', () => {
    expect(() => render(<NoProviderCaller />)).not.toThrow();
  });

  it('TrackFeature does not throw without a provider', () => {
    expect(() =>
      render(
        <TrackFeature name="player">
          <div />
        </TrackFeature>,
      ),
    ).not.toThrow();
  });
});

describe('useAnalyticsIdentity', () => {
  function Identity({ user }: { user: { id: string } | null }) {
    useAnalyticsIdentity(user);
    return null;
  }
  const ui = (send: any, user: { id: string } | null) => (
    <AnalyticsProvider options={opts(send)} consent="granted" pathname="/" search=""><Identity user={user} /></AnalyticsProvider>
  );

  it('resets before identifying a different user (A → B) so B gets a fresh anonymousId', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const { rerender } = render(ui(send, { id: 'user-a' }));
    rerender(ui(send, { id: 'user-b' }));
    await new Promise((r) => setTimeout(r, 0));
    const identifies = send.mock.calls.flatMap((c: any) => c[0].batch).filter((m: any) => m.type === 'identify');
    expect(identifies.map((m: any) => m.userId)).toEqual(['user-a', 'user-b']);
    expect(identifies[1].anonymousId).not.toBe(identifies[0].anonymousId);
    expect(identifies[1].context.sessionId).not.toBe(identifies[0].context.sessionId);
  });
});
