import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ChannelListItem } from '@/features/channels';
import { ChannelsRail } from './ChannelsRail';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const channel = (overrides: Partial<ChannelListItem> = {}): ChannelListItem => ({
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
  ...overrides,
});

describe('ChannelsRail', () => {
  it('renders nothing when there are no channels', () => {
    const { container } = render(<ChannelsRail channels={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders one card per channel, linking to the channel page', () => {
    render(
      <ChannelsRail
        channels={[channel(), channel({ id: 'ch-2', slug: 'canal-dois', name: 'Canal Dois' })]}
      />,
    );

    expect(screen.getByText('Canal Um').closest('a')).toHaveAttribute('href', '/channels/canal-um');
    expect(screen.getByText('Canal Dois').closest('a')).toHaveAttribute(
      'href',
      '/channels/canal-dois',
    );
  });

  it('marks the on-air channels and leaves the others unmarked', () => {
    render(
      <ChannelsRail
        channels={[
          channel({ isOnAir: true }),
          channel({ id: 'ch-2', slug: 'canal-dois', name: 'Canal Dois' }),
        ]}
      />,
    );

    expect(screen.getAllByText('onAir')).toHaveLength(1);
  });

  it('shows what is playing now on an on-air channel', () => {
    render(
      <ChannelsRail
        channels={[
          channel({
            isOnAir: true,
            current: {
              programId: 'prg-1',
              name: 'Jornal da Meia-Noite',
              startsAt: '2026-08-21T21:30:00-03:00',
              endsAt: '2026-08-21T22:30:00-03:00',
            },
          }),
        ]}
      />,
    );

    expect(screen.getByText('Jornal da Meia-Noite')).toBeInTheDocument();
  });

  it('links to the full channel listing', () => {
    render(<ChannelsRail channels={[channel()]} />);

    expect(screen.getByText('seeAll')).toHaveAttribute('href', '/channels');
  });
});
