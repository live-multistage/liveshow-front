import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LiveNoAccess } from './LiveNoAccess';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ usePathname: () => '/live/evt-1' }));
vi.mock('@/shared/components/Navbar', () => ({ Navbar: () => null }));
vi.mock('@/features/events', () => ({
  useGetEventQuery: () => ({ data: undefined }),
  useListTicketProductsQuery: () => ({ data: undefined }),
  formatPrice: () => '',
  formatPriceRange: () => '',
  formatDate: () => '',
  formatDuration: () => '',
}));
vi.mock('../hooks/use-viewer-count', () => ({ useViewerCount: () => ({ currentViewers: 0 }) }));

const mockTrack = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: mockTrack }) }));

describe('LiveNoAccess', () => {
  it('tracks player_opened with hasAccess:false, mode:live once on mount', () => {
    render(<LiveNoAccess eventId="evt-1" eventTitle="Show" isLoggedIn={false} />);
    expect(mockTrack).toHaveBeenCalledWith('player_opened', { eventId: 'evt-1', mode: 'live', hasAccess: false });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});
