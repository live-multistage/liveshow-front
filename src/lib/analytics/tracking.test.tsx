import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/events/evt-1',
  useSearchParams: () => new URLSearchParams(),
}));

const auth: { user: { id: string } | null } = { user: null };
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => auth,
}));

const impersonation = { active: false };
vi.mock('@/features/platform-admin/impersonation/impersonation.store', () => ({
  useImpersonationStore: (select: (s: { active: boolean }) => unknown) => select(impersonation),
}));

let consent: 'granted' | 'denied' | null = 'granted';
vi.mock('./consent', () => ({
  useAnalyticsConsent: () => ({ consent, setConsent: vi.fn() }),
}));

// NEXT_PUBLIC_TRACKING_WRITE_KEY is read once at module scope (mirrors how
// Next.js inlines NEXT_PUBLIC_ vars at build time) — each test needs a fresh
// module instance to pick up a stubbed value.
async function loadTrackingProvider() {
  vi.resetModules();
  const mod = await import('./tracking');
  return mod.TrackingProvider;
}

describe('TrackingProvider', () => {
  beforeEach(() => {
    auth.user = null;
    impersonation.active = false;
    consent = 'granted';
    vi.unstubAllEnvs();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('renders children without a write key configured, and never calls fetch', async () => {
    vi.stubEnv('NEXT_PUBLIC_TRACKING_WRITE_KEY', '');
    const TrackingProvider = await loadTrackingProvider();

    render(
      <TrackingProvider>
        <div>content</div>
      </TrackingProvider>,
    );

    expect(screen.getByText('content')).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 0));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('with a write key and granted consent, sends a page event carrying the write key', async () => {
    vi.stubEnv('NEXT_PUBLIC_TRACKING_WRITE_KEY', 'wk-test');
    const TrackingProvider = await loadTrackingProvider();
    vi.useFakeTimers();

    render(
      <TrackingProvider>
        <div>content</div>
      </TrackingProvider>,
    );

    expect(screen.getByText('content')).toBeInTheDocument();

    // Default flushIntervalMs is 5000; the SDK auto-flushes on that timer.
    await vi.advanceTimersByTimeAsync(5000);
    vi.useRealTimers();

    expect(global.fetch).toHaveBeenCalled();
    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(requestInit.body as string);
    expect(body.writeKey).toBe('wk-test');
    expect(body.batch.some((m: { type: string }) => m.type === 'page')).toBe(true);
  });

  it('does not throw when a child calls useAnalytics without a write key configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_TRACKING_WRITE_KEY', '');
    const TrackingProvider = await loadTrackingProvider();
    const { useAnalytics } = await import('./tracking');

    function Child() {
      useAnalytics().track('feature_viewed' as never, {} as never);
      return <div>content</div>;
    }

    expect(() =>
      render(
        <TrackingProvider>
          <Child />
        </TrackingProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('does not track while an admin is impersonating, and leaves the admin ids alone', async () => {
    vi.stubEnv('NEXT_PUBLIC_TRACKING_WRITE_KEY', 'wk-test');
    document.cookie = 'sho_aid=admin-aid; Path=/';
    impersonation.active = true;
    auth.user = { id: 'target-user' };
    const TrackingProvider = await loadTrackingProvider();
    vi.useFakeTimers();

    render(
      <TrackingProvider>
        <div>content</div>
      </TrackingProvider>,
    );

    expect(screen.getByText('content')).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(5000);
    vi.useRealTimers();

    expect(global.fetch).not.toHaveBeenCalled();
    expect(document.cookie).toContain('sho_aid=admin-aid');
  });
});
