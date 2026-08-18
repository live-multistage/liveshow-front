import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/events/ev-1',
}));

const useAuth = vi.fn();
vi.mock('@/features/account', () => ({
  useAuth: () => useAuth(),
}));

const useWishlistIdsQuery = vi.fn();
vi.mock('../queries/get-wishlist', () => ({
  useWishlistIdsQuery: (...args: unknown[]) => useWishlistIdsQuery(...args),
}));

const mutate = vi.fn();
const useToggleWishlistMutation = vi.fn();
vi.mock('../mutations/toggle-wishlist.mutation', () => ({
  useToggleWishlistMutation: () => useToggleWishlistMutation(),
}));

import { WishlistButton } from './WishlistButton';

beforeEach(() => {
  push.mockReset();
  mutate.mockReset();
  useAuth.mockReset();
  useWishlistIdsQuery.mockReset();
  useToggleWishlistMutation.mockReset();
  useToggleWishlistMutation.mockReturnValue({ mutate, isPending: false });
});

describe('WishlistButton', () => {
  it('logged out: clicking redirects to login and never calls the mutation', () => {
    useAuth.mockReturnValue({ isLoggedIn: false });
    useWishlistIdsQuery.mockReturnValue({ data: undefined });

    render(<WishlistButton eventId="ev-1" />);
    fireEvent.click(screen.getByRole('button'));

    expect(push).toHaveBeenCalledWith('/login?redirect=%2Fevents%2Fev-1');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('does not let the click bubble up to a wrapping Link', () => {
    useAuth.mockReturnValue({ isLoggedIn: false });
    useWishlistIdsQuery.mockReturnValue({ data: undefined });

    const parentClick = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
      <a href="/events/ev-1" onClick={parentClick}>
        <WishlistButton eventId="ev-1" />
      </a>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(parentClick).not.toHaveBeenCalled();
  });

  it('logged in, not saved: renders unpressed and toggles on click', () => {
    useAuth.mockReturnValue({ isLoggedIn: true });
    useWishlistIdsQuery.mockReturnValue({ data: ['other-event'] });

    render(<WishlistButton eventId="ev-1" />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);

    expect(push).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ eventId: 'ev-1', saved: false });
  });

  it('event already saved: renders pressed with the remove label', () => {
    useAuth.mockReturnValue({ isLoggedIn: true });
    useWishlistIdsQuery.mockReturnValue({ data: ['ev-1'] });

    render(<WishlistButton eventId="ev-1" />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAccessibleName('removeAria');
  });
});
