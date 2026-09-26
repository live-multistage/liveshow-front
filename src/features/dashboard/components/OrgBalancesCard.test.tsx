import { describe, it, expect, vi } from 'vitest';
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${vars.from}-${vars.to}/${vars.total}` : key,
}));
vi.mock('@/features/platform-admin/queries/get-finance', () => ({ useOrgBalancesQuery: vi.fn() }));
vi.mock('@/features/platform-admin/mutations/payout-org.mutation', () => ({
  usePayoutOrgMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/features/platform-admin/mutations/set-org-fee-override.mutation', () => ({
  useSetOrgFeeOverrideMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrgBalancesCard } from './OrgBalancesCard';
import { useOrgBalancesQuery } from '@/features/platform-admin/queries/get-finance';

const mockedQuery = vi.mocked(useOrgBalancesQuery);

function balances(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    orgId: `org-${i}`,
    name: `Org ${i}`,
    currency: 'BRL',
    balance: (count - i) * 1000,
    rate: 0.035,
    override: false,
  }));
}

function mockBalances(count: number) {
  mockedQuery.mockReturnValue({
    data: balances(count),
    isLoading: false,
  } as ReturnType<typeof useOrgBalancesQuery>);
}

describe('OrgBalancesCard — pagination', () => {
  it('renders one page of rows instead of the whole list', () => {
    mockBalances(403);
    render(<OrgBalancesCard />);

    expect(screen.getByText('Org 0')).toBeInTheDocument();
    expect(screen.getByText('Org 9')).toBeInTheDocument();
    expect(screen.queryByText('Org 10')).not.toBeInTheDocument();
  });

  it('moves to the next page', async () => {
    mockBalances(403);
    render(<OrgBalancesCard />);

    await userEvent.click(screen.getByRole('button', { name: 'pagination.nextAria' }));

    expect(screen.getByText('Org 10')).toBeInTheDocument();
    expect(screen.queryByText('Org 0')).not.toBeInTheDocument();
  });

  it('hides the pager when everything fits on one page', () => {
    mockBalances(4);
    render(<OrgBalancesCard />);

    expect(screen.getByText('Org 3')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  // A refetch that drops rows must not leave the view on a page that is gone.
  it('clamps to the last page when the list shrinks under it', async () => {
    mockBalances(403);
    const { rerender } = render(<OrgBalancesCard />);
    await userEvent.click(screen.getByRole('button', { name: 'pagination.nextAria' }));
    expect(screen.getByText('Org 10')).toBeInTheDocument();

    mockBalances(4);
    rerender(<OrgBalancesCard />);

    expect(screen.getByText('Org 0')).toBeInTheDocument();
  });
});
