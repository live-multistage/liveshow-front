import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveGate } from './LiveGate';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/live/evt-1' }));
vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: () => ({ isLoggedIn: true, isLoading: false }) }));
vi.mock('@/features/advertisements/hooks/use-preroll-gate', () => ({
  usePrerollGate: () => ({ ad: null, pending: false, markSeen: vi.fn() }),
}));
vi.mock('@/features/events/queries/get-event', () => ({ useGetEventQuery: () => ({ data: { title: 'Festival' } }) }));
vi.mock('@/features/wishlist', () => ({
  useWishlistIdsQuery: () => ({ data: [] }),
  useToggleWishlistMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
const unlock = vi.fn();
vi.mock('../hooks/use-stream-unlock', () => ({ useStreamUnlock: () => ({ unlock, pending: false }) }));
vi.mock('./LivePlayer', () => ({ LivePlayer: () => <div>live-player-stub</div> }));

const locked = {
  id: 's-full', title: 'Evento completo', position: 1, live: true,
  offer: { ticketProductId: 'tp-full', name: 'Evento completo', priceCents: 4990, currency: 'BRL' },
};
const playback = { data: { live: false, cameras: [], lockedStreams: [locked] } as unknown, isLoading: false, error: undefined };
vi.mock('../queries/live.queries', () => ({
  useLiveAccessQuery: () => ({ data: true, isLoading: false }),
  useLivePlaybackQuery: () => playback,
}));

describe('LiveGate — granted transmission offline, paid one live', () => {
  it('keeps the not-started state and offers the locked transmission', () => {
    render(<LiveGate eventId="evt-1" chatEnabled={false} />);

    expect(screen.queryByText('live-player-stub')).not.toBeInTheDocument();
    expect(screen.getByText(/49,90/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /unlockFullEvent/ }));
    expect(unlock).toHaveBeenCalledWith(locked);
  });
});
