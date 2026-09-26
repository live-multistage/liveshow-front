import { describe, it, expect, vi } from 'vitest';
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${vars.from}-${vars.to}/${vars.total}` : key,
}));
vi.mock('@/features/platform-admin/queries/get-audit', () => ({ useAuditSearchQuery: vi.fn() }));
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogCard } from './AuditLogCard';
import { useAuditSearchQuery } from '@/features/platform-admin/queries/get-audit';

const mockedQuery = vi.mocked(useAuditSearchQuery);

function page(pageNo: number, total: number) {
  return {
    data: {
      items: Array.from({ length: Math.min(10, total - (pageNo - 1) * 10) }, (_, i) => ({
        id: `e-${(pageNo - 1) * 10 + i}`,
        action: 'ORDER_PAID',
        actorName: `Actor ${(pageNo - 1) * 10 + i}`,
        targetLabel: null,
        metadata: null,
        createdAt: '2026-09-23T10:00:00.000Z',
      })),
      total,
      page: pageNo,
      limit: 10,
    },
    isLoading: false,
  } as ReturnType<typeof useAuditSearchQuery>;
}

describe('AuditLogCard — pagination', () => {
  it('asks the server for one page instead of a long tail', () => {
    mockedQuery.mockReturnValue(page(1, 57));
    render(<AuditLogCard />);

    expect(mockedQuery).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      expect.objectContaining({ refetchInterval: 30_000 }),
    );
    expect(screen.getByText('Actor 0')).toBeInTheDocument();
    expect(screen.queryByText('Actor 10')).not.toBeInTheDocument();
  });

  it('requests the next page from the server', async () => {
    mockedQuery.mockReturnValue(page(1, 57));
    render(<AuditLogCard />);

    await userEvent.click(screen.getByRole('button', { name: 'pagination.nextAria' }));

    expect(mockedQuery).toHaveBeenLastCalledWith(
      { page: 2, limit: 10 },
      // Polling belongs to the newest page only: a refresh mid-read would
      // shuffle rows under the reader.
      expect.objectContaining({ refetchInterval: false }),
    );
  });

  it('hides the pager when a single page holds everything', () => {
    mockedQuery.mockReturnValue(page(1, 6));
    render(<AuditLogCard />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
