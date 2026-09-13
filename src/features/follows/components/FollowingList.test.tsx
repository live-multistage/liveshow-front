import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/shared/components/EmptyStatePanel/EmptyStatePanel', () => ({
  EmptyStatePanel: ({ title, text }: { title: string; text: string }) => (
    <div data-testid="empty-panel">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  ),
}));

const useFollowListQuery = vi.fn();
vi.mock('../queries/get-follows', () => ({
  useFollowListQuery: (...args: unknown[]) => useFollowListQuery(...args),
}));

const useAuth = vi.fn(() => ({ isLoggedIn: true }));
vi.mock('@/features/account', () => ({
  useAuth: () => useAuth(),
}));

import { FollowingList } from './FollowingList';
import type { FollowItem } from '@live-show/api-contracts';

const ARTIST: FollowItem = {
  id: 'f-1',
  targetType: 'ARTIST',
  targetId: 'artist-1',
  name: 'Some Artist',
  slug: 'some-artist',
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const ORG: FollowItem = {
  id: 'f-2',
  targetType: 'ORGANIZATION',
  targetId: 'org-1',
  name: 'Some Org',
  slug: 'some-org',
  imageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function mockLists(artists: FollowItem[] = [], organizations: FollowItem[] = []) {
  useFollowListQuery.mockImplementation((targetType: 'ARTIST' | 'ORGANIZATION') => ({
    data: targetType === 'ARTIST' ? artists : organizations,
    isLoading: false,
  }));
}

beforeEach(() => {
  useFollowListQuery.mockReset();
  useAuth.mockReset();
  useAuth.mockReturnValue({ isLoggedIn: true });
});

describe('FollowingList', () => {
  it('logged out: shows the login empty state instead of "you follow nobody"', () => {
    useAuth.mockReturnValue({ isLoggedIn: false });
    mockLists([], []);

    render(<FollowingList />);

    expect(screen.getByTestId('empty-panel')).toBeInTheDocument();
    expect(screen.getByText('follows.loginToFollow')).toBeInTheDocument();
  });

  it('renders the empty state panel when nothing is followed', () => {
    mockLists([], []);

    render(<FollowingList />);

    expect(screen.getByTestId('empty-panel')).toBeInTheDocument();
  });

  it('renders followed artists and organizations, each linking to their public page', () => {
    mockLists([ARTIST], [ORG]);

    render(<FollowingList />);

    expect(screen.getByText('Some Artist')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Some Artist/ })).toHaveAttribute(
      'href',
      '/artists/some-artist',
    );

    expect(screen.getByText('Some Org')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Some Org/ })).toHaveAttribute('href', '/o/some-org');
  });
});
