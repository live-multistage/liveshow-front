import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MySubscription } from '../types/subscription.types';
import { SubscriptionList } from './SubscriptionList';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  useLocale: () => 'pt-BR',
}));

const listState: { data: MySubscription[] | undefined; isLoading: boolean; isError: boolean } = {
  data: undefined,
  isLoading: false,
  isError: false,
};
vi.mock('../queries/subscription.queries', () => ({
  useMySubscriptionsQuery: () => listState,
}));

const cancelMutate = vi.fn();
const resumeMutate = vi.fn();
const portalMutate = vi.fn();
const cancelState = { isPending: false };
vi.mock('../mutations/subscription.mutations', () => ({
  useCancelSubscriptionMutation: () => ({ mutate: cancelMutate, ...cancelState }),
  useResumeSubscriptionMutation: () => ({ mutate: resumeMutate, isPending: false }),
  usePortalMutation: () => ({ mutate: portalMutate, isPending: false }),
}));

const subscription = (overrides: Partial<MySubscription> = {}): MySubscription => ({
  id: 'sub-1',
  channel: { slug: 'canal', name: 'Canal Um', coverUrl: null },
  interval: 'MONTHLY',
  status: 'ACTIVE',
  currentPeriodEnd: '2026-09-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  priceCents: 2990,
  currency: 'BRL',
  ...overrides,
});

describe('SubscriptionList', () => {
  beforeEach(() => {
    cancelMutate.mockClear();
    resumeMutate.mockClear();
    portalMutate.mockClear();
    cancelState.isPending = false;
    listState.data = undefined;
    listState.isLoading = false;
    listState.isError = false;
  });

  it('shows a loading state', () => {
    listState.isLoading = true;
    render(<SubscriptionList />);
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('shows an error state before the empty state, and never the empty copy', () => {
    listState.isError = true;
    render(<SubscriptionList />);
    expect(screen.getByText('loadError')).toBeInTheDocument();
    expect(screen.queryByText('empty')).toBeNull();
  });

  it('shows an empty state', () => {
    listState.data = [];
    render(<SubscriptionList />);
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('renders the channel name, status, interval and period end', () => {
    listState.data = [subscription()];
    render(<SubscriptionList />);

    expect(screen.getByText('Canal Um')).toBeInTheDocument();
    expect(screen.getByText('status.ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('interval.MONTHLY')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*29,90/)).toBeInTheDocument();
  });

  it('shows the cancel-scheduled notice when cancelAtPeriodEnd is true', () => {
    listState.data = [subscription({ cancelAtPeriodEnd: true })];
    render(<SubscriptionList />);

    expect(screen.getByText('cancelScheduledNotice')).toBeInTheDocument();
  });

  it('shows "access until" instead of "renews on" when cancelAtPeriodEnd is true', () => {
    listState.data = [subscription({ cancelAtPeriodEnd: true })];
    render(<SubscriptionList />);

    expect(screen.getByText(/accessUntil:/)).toBeInTheDocument();
    expect(screen.queryByText(/^periodEnd:/)).toBeNull();
  });

  it('treats a CANCELED row as a terminal state with no actions, even if cancelAtPeriodEnd is stale-true', () => {
    listState.data = [subscription({ status: 'CANCELED', cancelAtPeriodEnd: true })];
    render(<SubscriptionList />);

    expect(screen.getByText('ended')).toBeInTheDocument();
    expect(screen.queryByText('cancel')).toBeNull();
    expect(screen.queryByText('resume')).toBeNull();
    expect(screen.queryByText('managePayment')).toBeNull();
    expect(screen.queryByText('cancelScheduledNotice')).toBeNull();
  });

  it('opens the cancel modal and confirms cancellation', () => {
    listState.data = [subscription()];
    render(<SubscriptionList />);

    fireEvent.click(screen.getByText('cancel'));
    expect(screen.getByText('cancelTitle')).toBeInTheDocument();

    fireEvent.click(screen.getByText('cancelConfirm'));
    expect(cancelMutate).toHaveBeenCalledWith('sub-1', expect.anything());
  });

  it('resumes a subscription scheduled for cancellation instead of showing a cancel button', () => {
    listState.data = [subscription({ cancelAtPeriodEnd: true })];
    render(<SubscriptionList />);

    expect(screen.queryByText('cancel')).toBeNull();
    fireEvent.click(screen.getByText('resume'));
    expect(resumeMutate).toHaveBeenCalledWith('sub-1');
  });

  it('opens the billing portal', () => {
    listState.data = [subscription()];
    render(<SubscriptionList />);

    fireEvent.click(screen.getByText('managePayment'));
    expect(portalMutate).toHaveBeenCalledWith('sub-1');
  });
});
