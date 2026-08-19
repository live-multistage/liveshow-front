import { describe, it, expect, beforeEach, vi } from 'vitest';
import { track } from './analytics-client';
import { setAnalyticsConsent } from './consent';

// The consent gate is the LGPD-critical branch: no behavioral event may leave
// the browser until the visitor opts in.
describe('track() consent gate', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('does not send when consent is unset (default denied)', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null));
    track({ eventType: 'event.viewed', entityType: 'event', entityId: 'e1' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not send when consent is denied', () => {
    setAnalyticsConsent('denied');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null));
    track({ eventType: 'event.viewed' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends once consent is granted', () => {
    setAnalyticsConsent('granted');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null));
    track({ eventType: 'event.viewed' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
