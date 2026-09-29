import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTrack, mockState, mockSetConsent, mockSyncConsent } = vi.hoisted(() => ({
  mockTrack: vi.fn(),
  mockState: { consent: null as 'granted' | 'denied' | null },
  mockSetConsent: vi.fn(),
  mockSyncConsent: vi.fn(),
}));

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: mockTrack }) }));
vi.mock('@/lib/analytics/consent', () => ({
  useAnalyticsConsent: () => ({ consent: mockState.consent, setConsent: mockSetConsent }),
}));
vi.mock('./privacy.service', () => ({ privacyService: { syncConsent: mockSyncConsent } }));

import { render, screen } from '@testing-library/react';
import { ConsentBanner } from './ConsentBanner';

describe('ConsentBanner', () => {
  beforeEach(() => {
    mockState.consent = null;
    vi.clearAllMocks();
    mockSetConsent.mockImplementation((state: 'granted' | 'denied') => { mockState.consent = state; });
  });

  it('tracks consent_decided before granting', () => {
    render(<ConsentBanner />);
    screen.getByText('accept').click();

    expect(mockTrack).toHaveBeenCalledWith('consent_decided', { choice: 'granted' });
    expect(mockSetConsent).toHaveBeenCalledWith('granted');
    expect(mockSyncConsent).toHaveBeenCalledWith(true);
  });

  it('tracks consent_decided on reject', () => {
    render(<ConsentBanner />);
    screen.getByText('reject').click();

    expect(mockTrack).toHaveBeenCalledWith('consent_decided', { choice: 'denied' });
    expect(mockSetConsent).toHaveBeenCalledWith('denied');
    expect(mockSyncConsent).toHaveBeenCalledWith(false);
  });

  it('renders nothing once the visitor has decided', () => {
    mockState.consent = 'granted';
    const { container } = render(<ConsentBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
