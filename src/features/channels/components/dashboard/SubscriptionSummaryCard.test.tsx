import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscriptionSummaryCard } from './SubscriptionSummaryCard';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const summaryState: { data: unknown; isLoading: boolean } = { data: undefined, isLoading: false };
vi.mock('../../queries/channel.queries', () => ({
  useChannelSubscriptionSummaryQuery: () => summaryState,
}));

describe('SubscriptionSummaryCard', () => {
  beforeEach(() => {
    summaryState.data = undefined;
    summaryState.isLoading = false;
  });

  it('renders active, past-due, canceled and mrr numbers', () => {
    summaryState.data = { active: 12, pastDue: 2, canceledThisMonth: 1, mrrCents: 358800 };

    render(<SubscriptionSummaryCard channelId="ch-1" currency="BRL" />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/3\.588,00/)).toBeInTheDocument();
  });

  it('falls back to BRL when the channel has no currency yet', () => {
    summaryState.data = { active: 0, pastDue: 0, canceledThisMonth: 0, mrrCents: 0 };

    render(<SubscriptionSummaryCard channelId="ch-1" currency={null} />);

    expect(screen.getByText(/R\$/)).toBeInTheDocument();
  });
});
