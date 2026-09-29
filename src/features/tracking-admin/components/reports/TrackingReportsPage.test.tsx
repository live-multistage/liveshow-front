vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.rich = (key: string) => key;
    return t;
  },
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/platform/tracking/funnels' }));

vi.mock('./ExploreTab', () => ({ ExploreTab: () => <div data-testid="explore-tab" /> }));
vi.mock('./FunnelTab', () => ({ FunnelTab: () => <div data-testid="funnel-tab" /> }));
vi.mock('./RetentionTab', () => ({ RetentionTab: () => <div data-testid="retention-tab" /> }));
vi.mock('./FeaturesTab', () => ({ FeaturesTab: () => <div data-testid="features-tab" /> }));

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackingReportsPage } from './TrackingReportsPage';

describe('TrackingReportsPage', () => {
  it('renders the tab matching the `tab` prop', () => {
    render(<TrackingReportsPage tab="funnels" trackingEnabled />);
    expect(screen.getByTestId('funnel-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('explore-tab')).not.toBeInTheDocument();
  });

  it('shows the flag-off banner when tracking is disabled', () => {
    render(<TrackingReportsPage tab="explore" trackingEnabled={false} />);
    expect(screen.getByText('shell.flagOffBanner')).toBeInTheDocument();
  });
});
