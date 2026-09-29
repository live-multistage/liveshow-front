import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyTicketsPageContent } from './MyTicketsPageContent';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('./TicketList', () => ({ TicketList: () => <div data-testid="ticket-list" /> }));

const useTickets = vi.fn();
vi.mock('../hooks/use-tickets', () => ({ useTickets: () => useTickets() }));

const useListEventsQuery = vi.fn();
vi.mock('@/features/events', () => ({
  useListEventsQuery: () => useListEventsQuery(),
  eventToShow: (event: { id: string; title: string }) => ({ id: event.id, title: event.title }),
  ShowCard: ({ show, list, position }: { show: { id: string; title: string }; list?: string; position?: number }) => (
    <div data-testid="show-card" data-list={list} data-position={position}>{show.title}</div>
  ),
}));

beforeEach(() => {
  useTickets.mockReturnValue({
    tickets: [{ event: { id: 'owned-1' } }],
    withReplay: [],
    withoutReplay: [],
    withCamera: [],
    isLoading: false,
  });
  useListEventsQuery.mockReturnValue({
    data: [
      { id: 'owned-1', title: 'Already owned' },
      { id: 'reco-1', title: 'Reco 1' },
      { id: 'reco-2', title: 'Reco 2' },
    ],
  });
});

describe('MyTicketsPageContent recommendations tracking', () => {
  it('tags recommended ShowCards with the tickets list name and their position, excluding owned events', () => {
    render(<MyTicketsPageContent />);

    const cards = screen.getAllByTestId('show-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Reco 1');
    expect(cards[0]).toHaveAttribute('data-list', 'tickets');
    expect(cards[0]).toHaveAttribute('data-position', '0');
    expect(cards[1]).toHaveAttribute('data-position', '1');
  });
});
