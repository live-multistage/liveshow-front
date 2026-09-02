import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgramTopologyTab } from './ProgramTopologyTab';
import type { ProgramEpisode } from '../../types/channel.types';

const mutate = vi.fn();
let streamsQueryResult: { data: unknown[]; isLoading: boolean } = { data: [], isLoading: false };
let episodesQueryResult: { data: ProgramEpisode[] } = { data: [] };
const goLiveMutate = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

vi.mock('@/features/streams', () => ({
  useProgramStreamsQuery: () => streamsQueryResult,
  useCreateProgramStreamMutation: () => ({ mutate, isPending: false }),
  StreamBuilder: ({ stream }: { stream: { title: string } }) => <div>builder:{stream.title}</div>,
}));

vi.mock('../../queries/channel.queries', () => ({
  useProgramEpisodesQuery: () => episodesQueryResult,
}));

vi.mock('../../mutations/channel.mutations', () => ({
  useGoLiveNowMutation: () => ({ mutate: goLiveMutate, isPending: false }),
}));

vi.mock('@live-show/design-system', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  Skeleton: (props: React.ComponentProps<'div'>) => <div data-testid="skeleton" {...props} />,
}));

describe('ProgramTopologyTab', () => {
  beforeEach(() => {
    mutate.mockReset();
    goLiveMutate.mockReset();
    episodesQueryResult = { data: [] };
  });

  it('renders the StreamBuilder when a stream already exists', () => {
    streamsQueryResult = { data: [{ id: 's1', title: 'Estúdio Principal' }], isLoading: false };

    render(<ProgramTopologyTab channelId="ch-1" slug="canal-um" programId="p1" programName="Programa X" />);

    expect(screen.getByText('builder:Estúdio Principal')).toBeInTheDocument();
  });

  it('shows a create button and triggers the mutation when there is no stream yet', () => {
    streamsQueryResult = { data: [], isLoading: false };

    render(<ProgramTopologyTab channelId="ch-1" slug="canal-um" programId="p1" programName="Programa X" />);

    const button = screen.getByRole('button', { name: 'studioCreate' });
    fireEvent.click(button);

    expect(mutate).toHaveBeenCalledWith({ title: 'Programa X' });
  });

  it('starts the program live now', () => {
    streamsQueryResult = { data: [{ id: 's1', title: 'Estúdio Principal' }], isLoading: false };

    render(<ProgramTopologyTab channelId="ch-1" slug="canal-um" programId="p1" programName="Programa X" />);

    fireEvent.click(screen.getByText('goLiveNow'));

    expect(goLiveMutate).toHaveBeenCalledWith({ programId: 'p1', slug: 'canal-um' });
  });

  it('disables the go-live button while an episode is live', () => {
    streamsQueryResult = { data: [{ id: 's1', title: 'Estúdio Principal' }], isLoading: false };
    episodesQueryResult = {
      data: [
        {
          id: 'ev-1',
          title: 'Programa X',
          startsAt: '2026-08-20T20:00:00.000Z',
          endsAt: '2026-08-20T21:00:00.000Z',
          status: 'LIVE',
        },
      ],
    };

    render(<ProgramTopologyTab channelId="ch-1" slug="canal-um" programId="p1" programName="Programa X" />);

    expect(screen.getByText('goLiveNow')).toBeDisabled();
  });
});
