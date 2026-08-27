import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ChannelListItem } from '../types/channel.types';
import { ChannelsBrowser } from './ChannelsBrowser';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
  useLocale: () => 'pt-BR',
}));

// ChannelCard is exercised elsewhere; here we only care about filter/search.
vi.mock('./ChannelCard', () => ({
  ChannelCard: ({ channel }: { channel: ChannelListItem }) => <div>{channel.name}</div>,
}));

const channel = (o: Partial<ChannelListItem>): ChannelListItem =>
  ({
    id: o.slug,
    organizationId: 'org-1',
    slug: o.slug,
    name: o.name,
    description: null,
    coverUrl: null,
    accessMode: o.accessMode ?? 'FREE',
    status: 'PUBLISHED',
    broadcastEventId: 'evt',
    timezone: 'America/Sao_Paulo',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isOnAir: o.isOnAir ?? false,
    current: null,
    next: null,
  }) as ChannelListItem;

const channels = [
  channel({ slug: 'arena', name: 'Arena Rock', accessMode: 'FREE', isOnAir: true }),
  channel({ slug: 'alt', name: 'Palco Alternativo', accessMode: 'SUBSCRIPTION', isOnAir: false }),
  channel({ slug: 'back', name: 'Backstage', accessMode: 'SUBSCRIPTION', isOnAir: true }),
];

describe('ChannelsBrowser', () => {
  it('shows all channels by default', () => {
    render(<ChannelsBrowser channels={channels} />);
    expect(screen.getByText('Arena Rock')).toBeInTheDocument();
    expect(screen.getByText('Palco Alternativo')).toBeInTheDocument();
    expect(screen.getByText('Backstage')).toBeInTheDocument();
  });

  it('filters to on-air channels', () => {
    render(<ChannelsBrowser channels={channels} />);
    fireEvent.click(screen.getByText(/browse\.filterLive/));
    expect(screen.getByText('Arena Rock')).toBeInTheDocument();
    expect(screen.getByText('Backstage')).toBeInTheDocument();
    expect(screen.queryByText('Palco Alternativo')).not.toBeInTheDocument();
  });

  it('filters by subscription access', () => {
    render(<ChannelsBrowser channels={channels} />);
    fireEvent.click(screen.getByText(/browse\.filterSub/));
    expect(screen.queryByText('Arena Rock')).not.toBeInTheDocument();
    expect(screen.getByText('Palco Alternativo')).toBeInTheDocument();
    expect(screen.getByText('Backstage')).toBeInTheDocument();
  });

  it('searches by name', () => {
    render(<ChannelsBrowser channels={channels} />);
    fireEvent.change(screen.getByPlaceholderText('browse.searchPlaceholder'), {
      target: { value: 'arena' },
    });
    expect(screen.getByText('Arena Rock')).toBeInTheDocument();
    expect(screen.queryByText('Backstage')).not.toBeInTheDocument();
  });
});
