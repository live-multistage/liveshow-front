import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChannelCard } from './ChannelCard';
import type { ChannelListItem } from '../types/channel.types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

function makeChannel(overrides: Partial<ChannelListItem> = {}): ChannelListItem {
  return {
    id: 'ch-1',
    organizationId: 'org-1',
    slug: 'canal-um',
    name: 'Canal Um',
    description: null,
    coverUrl: null,
    accessMode: 'FREE',
    status: 'PUBLISHED',
    broadcastEventId: 'evt-1',
    timezone: 'America/Sao_Paulo',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    isOnAir: false,
    current: null,
    next: null,
    ...overrides,
  };
}

describe('ChannelCard CTA', () => {
  it('shows the watch-now CTA when the channel is on air', () => {
    render(<ChannelCard channel={makeChannel({ isOnAir: true })} />);

    expect(screen.getByText('watchNow')).toBeInTheDocument();
  });

  it('shows the view-schedule CTA when the channel is off air', () => {
    render(<ChannelCard channel={makeChannel({ isOnAir: false })} />);

    expect(screen.getByText('viewSchedule')).toBeInTheDocument();
  });
});
