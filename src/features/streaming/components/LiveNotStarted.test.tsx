import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LiveNotStarted } from './LiveNotStarted';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/live/evt-1',
}));

const useAuth = vi.fn();
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => useAuth(),
}));

const useGetEventQuery = vi.fn();
vi.mock('@/features/events/queries/get-event', () => ({
  useGetEventQuery: (...args: unknown[]) => useGetEventQuery(...args),
}));

const useWishlistIdsQuery = vi.fn();
const mutate = vi.fn();
const useToggleWishlistMutation = vi.fn();
vi.mock('@/features/wishlist', () => ({
  useWishlistIdsQuery: (...args: unknown[]) => useWishlistIdsQuery(...args),
  useToggleWishlistMutation: () => useToggleWishlistMutation(),
}));

beforeEach(() => {
  useAuth.mockReturnValue({ isLoggedIn: true });
  useWishlistIdsQuery.mockReturnValue({ data: [] });
  useToggleWishlistMutation.mockReturnValue({ mutate, isPending: false });
  mutate.mockReset();
});

describe('LiveNotStarted', () => {
  it('shows a ticking countdown when startsAt is in the future', () => {
    useGetEventQuery.mockReturnValue({
      data: { title: 'Show', startsAt: new Date(Date.now() + 3661_000).toISOString() },
    });

    render(<LiveNotStarted eventId="evt-1" cameraCount={3} onExit={vi.fn()} />);

    expect(screen.getByText('A TRANSMISSÃO COMEÇA EM')).toBeInTheDocument();
    expect(screen.getByText(/01:0[01]:0[01]/)).toBeInTheDocument();
  });

  it('hides the countdown when startsAt is in the past', () => {
    useGetEventQuery.mockReturnValue({
      data: { title: 'Show', startsAt: new Date(Date.now() - 1000).toISOString() },
    });

    render(<LiveNotStarted eventId="evt-1" cameraCount={3} onExit={vi.fn()} />);

    expect(screen.queryByText('A TRANSMISSÃO COMEÇA EM')).not.toBeInTheDocument();
    expect(screen.getByText('AGUARDANDO O INÍCIO DA TRANSMISSÃO')).toBeInTheDocument();
  });

  it('wires "Avisar quando começar" to the wishlist toggle mutation', () => {
    useGetEventQuery.mockReturnValue({ data: { title: 'Show' } });

    render(<LiveNotStarted eventId="evt-1" cameraCount={3} onExit={vi.fn()} />);
    fireEvent.click(screen.getByText('Avisar quando começar'));

    expect(mutate).toHaveBeenCalledWith({ eventId: 'evt-1', saved: false });
  });

  it('shows "Você será avisado" once the event is already on the wishlist', () => {
    useWishlistIdsQuery.mockReturnValue({ data: ['evt-1'] });
    useGetEventQuery.mockReturnValue({ data: { title: 'Show' } });

    render(<LiveNotStarted eventId="evt-1" cameraCount={3} onExit={vi.fn()} />);

    expect(screen.getByText('Você será avisado')).toBeInTheDocument();
  });
});
