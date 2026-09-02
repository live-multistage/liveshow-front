import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StreamsPageContent } from './StreamsPageContent';

// O container do canal (format=CHANNEL) nunca aparece em useMyEventsQuery, então
// a página tem que sustentar um ?eventId= que não está na lista.
const CHANNEL_EVENT = 'ev-channel';

const searchParams = new URLSearchParams({
  eventId: CHANNEL_EVENT,
  title: 'Canal Um',
});

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

vi.mock('@/features/events/queries/get-my-events', () => ({
  useMyEventsQuery: () => ({
    data: [{ id: 'ev-normal', title: 'Show Normal' }],
    isLoading: false,
  }),
}));

vi.mock('../queries/streams.queries', () => ({
  useEventStreamsQuery: () => ({ data: [], isLoading: false }),
}));

vi.mock('../queries/ingest.queries', () => ({
  useOnAirCamera: () => ({ onAir: null }),
  useStreamStatsQuery: () => ({ data: undefined }),
}));

vi.mock('@/features/streaming', () => ({ useViewerCount: () => ({ currentViewers: 0 }) }));
vi.mock('../mutations/stream.mutations', () => ({ useCreateStreamMutation: () => ({}) }));
vi.mock('./StreamCard', () => ({ StreamCard: () => null }));
vi.mock('./StreamBuilder', () => ({ StreamBuilder: () => null }));
vi.mock('./StreamSetupTutorial', () => ({ StreamSetupTutorial: () => null }));
vi.mock('./StreamsHowItWorks', () => ({ StreamsHowItWorks: () => null }));

// Stub do select: expõe value/options como um <select> nativo para inspeção.
vi.mock('@live-show/design-system', () => ({
  SimpleCustomSelect: ({
    value,
    onValueChange,
    options,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <select
      aria-label="evento"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="" />
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

describe('StreamsPageContent event selector', () => {
  it('keeps an URL-seeded event selectable even when it is absent from the list', () => {
    render(<StreamsPageContent />);

    const select = screen.getByLabelText('evento') as HTMLSelectElement;

    // Continua selecionado, com o nome vindo da URL — não cai no placeholder.
    expect(select.value).toBe(CHANNEL_EVENT);
    expect(screen.getByRole('option', { name: 'Canal Um' })).toBeDefined();

    // E dá para voltar para ele depois de trocar de evento.
    fireEvent.change(select, { target: { value: 'ev-normal' } });
    expect(select.value).toBe('ev-normal');
    fireEvent.change(select, { target: { value: CHANNEL_EVENT } });
    expect(select.value).toBe(CHANNEL_EVENT);
  });
});
