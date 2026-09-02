import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgramEpisodesList } from './ProgramEpisodesList';
import type { ProgramEpisode } from '../../types/channel.types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const episode = (overrides: Partial<ProgramEpisode> = {}): ProgramEpisode => ({
  id: 'ev-1',
  title: 'Jornal da Meia-Noite',
  startsAt: '2026-08-20T20:00:00.000Z',
  endsAt: '2026-08-20T21:00:00.000Z',
  status: 'FINISHED',
  ...overrides,
});

describe('ProgramEpisodesList', () => {
  it('links finished episodes to their replay', () => {
    render(<ProgramEpisodesList episodes={[episode()]} />);

    const link = screen.getByRole('link', { name: /jornal da meia-noite/i });
    expect(link).toHaveAttribute('href', '/events/ev-1');
  });

  it('does not link an episode that has not finished yet', () => {
    render(<ProgramEpisodesList episodes={[episode({ status: 'LIVE' })]} />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Jornal da Meia-Noite')).toBeInTheDocument();
  });

  it('renders nothing when there are no episodes', () => {
    const { container } = render(<ProgramEpisodesList episodes={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
