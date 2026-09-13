import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/artists/some-artist',
}));

const useAuth = vi.fn();
vi.mock('@/features/account', () => ({
  useAuth: () => useAuth(),
}));

const useFollowIdsQuery = vi.fn();
const useFollowCountQuery = vi.fn();
vi.mock('../queries/get-follows', () => ({
  useFollowIdsQuery: (...args: unknown[]) => useFollowIdsQuery(...args),
  useFollowCountQuery: (...args: unknown[]) => useFollowCountQuery(...args),
}));

const mutate = vi.fn();
const useToggleFollowMutation = vi.fn();
vi.mock('../mutations/toggle-follow.mutation', () => ({
  useToggleFollowMutation: () => useToggleFollowMutation(),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { FollowButton } from './FollowButton';
import { toast } from 'sonner';

beforeEach(() => {
  push.mockReset();
  mutate.mockReset();
  useAuth.mockReset();
  useFollowIdsQuery.mockReset();
  useFollowCountQuery.mockReset();
  useToggleFollowMutation.mockReset();
  useToggleFollowMutation.mockReturnValue({ mutate, isPending: false });
  useFollowCountQuery.mockReturnValue({ data: undefined });
});

describe('FollowButton', () => {
  it('logged out: clicking redirects to login and never calls the mutation', () => {
    useAuth.mockReturnValue({ isLoggedIn: false });
    useFollowIdsQuery.mockReturnValue({ data: undefined });

    render(<FollowButton targetType="ARTIST" targetId="artist-1" />);
    fireEvent.click(screen.getByRole('button'));

    expect(push).toHaveBeenCalledWith('/login?redirect=%2Fartists%2Fsome-artist');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('logged out: never sets aria-pressed (there is no follow state to report)', () => {
    useAuth.mockReturnValue({ isLoggedIn: false });
    useFollowIdsQuery.mockReturnValue({ data: undefined });

    render(<FollowButton targetType="ARTIST" targetId="artist-1" />);

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-pressed');
  });

  it('logged in, not following: toggles on click', () => {
    useAuth.mockReturnValue({ isLoggedIn: true });
    useFollowIdsQuery.mockReturnValue({ data: ['other-artist'] });

    render(<FollowButton targetType="ARTIST" targetId="artist-1" />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('follow')).toBeInTheDocument();

    fireEvent.click(button);

    expect(push).not.toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith(
      { targetType: 'ARTIST', targetId: 'artist-1', following: false },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('already following: renders pressed with the following label and toggles off', () => {
    useAuth.mockReturnValue({ isLoggedIn: true });
    useFollowIdsQuery.mockReturnValue({ data: ['artist-1'] });

    render(<FollowButton targetType="ARTIST" targetId="artist-1" />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('following')).toBeInTheDocument();

    fireEvent.click(button);

    expect(mutate).toHaveBeenCalledWith(
      { targetType: 'ARTIST', targetId: 'artist-1', following: true },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('toasts a generic error when the mutation rejects', () => {
    useAuth.mockReturnValue({ isLoggedIn: true });
    useFollowIdsQuery.mockReturnValue({ data: [] });

    render(<FollowButton targetType="ARTIST" targetId="artist-1" />);
    fireEvent.click(screen.getByRole('button'));

    const [, options] = mutate.mock.calls[0];
    options.onError();

    expect(toast.error).toHaveBeenCalledWith('error');
  });

  it('showCount: renders the follower count once loaded', () => {
    useAuth.mockReturnValue({ isLoggedIn: true });
    useFollowIdsQuery.mockReturnValue({ data: [] });
    useFollowCountQuery.mockReturnValue({ data: 42 });

    render(<FollowButton targetType="ARTIST" targetId="artist-1" showCount />);

    expect(screen.getByText('followersCount:{"count":42}')).toBeInTheDocument();
  });
});
