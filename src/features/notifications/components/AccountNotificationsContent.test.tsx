vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => ({ isLoggedIn: true, isLoading: false }),
}));

vi.mock('../services/notifications.service', () => ({
  notificationsService: {
    page: vi.fn(),
    unreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AccountNotificationsContent } from './AccountNotificationsContent';
import { notificationsService } from '../services/notifications.service';
import type { NotificationResponse, NotificationsPageResponse, NotificationFilter } from '../types/notification.types';

const mockedPage = vi.mocked(notificationsService.page);
const mockedUnreadCount = vi.mocked(notificationsService.unreadCount);
const mockedMarkAsRead = vi.mocked(notificationsService.markAsRead);
const mockedDismiss = vi.mocked(notificationsService.dismiss);

// Real timers throughout (waitFor/userEvent poll with real setTimeout) —
// offsets are built from local calendar-day arithmetic, the same method
// notification-groups.ts uses, so the grouping stays deterministic regardless
// of the hour the suite runs at.
function daysAgoISO(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

const TODAY: NotificationResponse = {
  id: 'today', type: 'EVENT', title: 'Show ao vivo', message: 'Começou agora', read: false, link: null,
  createdAt: daysAgoISO(0),
};
const YESTERDAY: NotificationResponse = {
  id: 'yesterday', type: 'TICKET', title: 'Lembrete de ingresso', message: 'Falta 1h', read: true, link: null,
  createdAt: daysAgoISO(1),
};
const THIS_WEEK: NotificationResponse = {
  id: 'thisweek', type: 'PAYMENT', title: 'Pagamento confirmado', message: 'Recebemos seu pagamento', read: false,
  link: '/purchases/1', createdAt: daysAgoISO(4),
};
const EARLIER: NotificationResponse = {
  id: 'earlier', type: 'SYSTEM', title: 'Atualização de sistema', message: 'Manutenção concluída', read: true,
  link: null, createdAt: daysAgoISO(22),
};

function page(items: NotificationResponse[], counts: NotificationsPageResponse['counts'], nextCursor: string | null = null): NotificationsPageResponse {
  return { items, nextCursor, counts };
}

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper };
}

describe('AccountNotificationsContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUnreadCount.mockResolvedValue(2);
  });

  it('groups notifications by HOJE/ONTEM/ESTA SEMANA/ANTERIORES', async () => {
    mockedPage.mockResolvedValue(
      page([TODAY, YESTERDAY, THIS_WEEK, EARLIER], { all: 4, unread: 2, shows: 1, tickets: 1, account: 2 }),
    );
    const { wrapper } = makeWrapper();
    render(<AccountNotificationsContent />, { wrapper });

    await waitFor(() => expect(screen.getByText('Show ao vivo')).toBeInTheDocument());

    expect(screen.getByText('groups.today')).toBeInTheDocument();
    expect(screen.getByText('groups.yesterday')).toBeInTheDocument();
    expect(screen.getByText('groups.thisWeek')).toBeInTheDocument();
    expect(screen.getByText('groups.earlier')).toBeInTheDocument();
  });

  it('renders filter pill counts from the response and requests the new filter on switch', async () => {
    mockedPage.mockImplementation(async ({ filter }: { filter: NotificationFilter }) => {
      if (filter === 'unread') return page([TODAY, THIS_WEEK], { all: 4, unread: 2, shows: 1, tickets: 1, account: 2 });
      return page([TODAY, YESTERDAY, THIS_WEEK, EARLIER], { all: 4, unread: 2, shows: 1, tickets: 1, account: 2 });
    });
    const { wrapper } = makeWrapper();
    const user = userEvent.setup();
    render(<AccountNotificationsContent />, { wrapper });

    await waitFor(() => expect(screen.getByText('Show ao vivo')).toBeInTheDocument());

    const unreadTab = screen.getByRole('button', { name: /filters\.unread/ });
    expect(within(unreadTab).getByText('2')).toBeInTheDocument();

    await user.click(unreadTab);

    await waitFor(() => expect(mockedPage).toHaveBeenCalledWith(expect.objectContaining({ filter: 'unread' })));
    expect(unreadTab).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables "mark all" and hides the unread pill when there are no unread notifications', async () => {
    mockedUnreadCount.mockResolvedValue(0);
    mockedPage.mockResolvedValue(page([YESTERDAY], { all: 1, unread: 0, shows: 0, tickets: 1, account: 0 }));
    const { wrapper } = makeWrapper();
    render(<AccountNotificationsContent />, { wrapper });

    await waitFor(() => expect(screen.getByText('Lembrete de ingresso')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: /markAll/ })).toBeDisabled();
    expect(screen.queryByText(/unreadPill/)).not.toBeInTheDocument();
  });

  it('marks a row read and navigates when its link is safe', async () => {
    mockedPage.mockResolvedValue(page([THIS_WEEK], { all: 1, unread: 1, shows: 0, tickets: 0, account: 1 }));
    mockedMarkAsRead.mockResolvedValue(undefined);
    const { wrapper } = makeWrapper();
    const user = userEvent.setup();
    render(<AccountNotificationsContent />, { wrapper });

    const row = await screen.findByText('Pagamento confirmado');
    await user.click(row);

    await waitFor(() => expect(mockedMarkAsRead).toHaveBeenCalledWith('thisweek'));
    expect(push).toHaveBeenCalledWith('/purchases/1');
  });

  it('dismisses a notification and removes it from the list', async () => {
    // The mutation invalidates on settle, which refetches page 1 — the second
    // resolved value stands in for the server's post-dismiss state.
    mockedPage
      .mockResolvedValueOnce(page([TODAY, YESTERDAY], { all: 2, unread: 1, shows: 1, tickets: 1, account: 0 }))
      .mockResolvedValueOnce(page([YESTERDAY], { all: 1, unread: 1, shows: 0, tickets: 1, account: 0 }));
    mockedDismiss.mockResolvedValue(undefined);
    const { wrapper } = makeWrapper();
    const user = userEvent.setup();
    render(<AccountNotificationsContent />, { wrapper });

    await screen.findByText('Show ao vivo');
    await user.click(screen.getAllByRole('button', { name: /dismiss/i })[0]);

    expect(mockedDismiss).toHaveBeenCalledWith('today');
    await waitFor(() => expect(screen.queryByText('Show ao vivo')).not.toBeInTheDocument());
    // The other row stays.
    expect(screen.getByText('Lembrete de ingresso')).toBeInTheDocument();
  });

  it('shows the total-empty state with an explore CTA when there are no notifications at all', async () => {
    mockedPage.mockResolvedValue(page([], { all: 0, unread: 0, shows: 0, tickets: 0, account: 0 }));
    const { wrapper } = makeWrapper();
    render(<AccountNotificationsContent />, { wrapper });

    await waitFor(() => expect(screen.getByText('emptyTitle')).toBeInTheDocument());
    expect(screen.getByText('emptyDesc')).toBeInTheDocument();
    expect(screen.getByText(/explore/)).toBeInTheDocument();
  });

  it('shows the filter-empty state (no CTA) when the filter has no matches but other notifications exist', async () => {
    mockedPage.mockImplementation(async ({ filter }: { filter: NotificationFilter }) => {
      if (filter === 'account') return page([], { all: 1, unread: 1, shows: 1, tickets: 0, account: 0 });
      return page([TODAY], { all: 1, unread: 1, shows: 1, tickets: 0, account: 0 });
    });
    const { wrapper } = makeWrapper();
    const user = userEvent.setup();
    render(<AccountNotificationsContent />, { wrapper });

    await screen.findByText('Show ao vivo');
    await user.click(screen.getByRole('button', { name: /filters\.account/ }));

    await waitFor(() => expect(screen.getByText('filterEmptyTitle')).toBeInTheDocument());
    expect(screen.getByText('filterEmptyDesc')).toBeInTheDocument();
    expect(screen.queryByText(/explore/)).not.toBeInTheDocument();
  });

  it('shows an error state with a retry button that refetches', async () => {
    mockedPage.mockRejectedValueOnce(new Error('boom'));
    mockedPage.mockResolvedValueOnce(page([TODAY], { all: 1, unread: 1, shows: 1, tickets: 0, account: 0 }));
    const { wrapper } = makeWrapper();
    const user = userEvent.setup();
    render(<AccountNotificationsContent />, { wrapper });

    await waitFor(() => expect(screen.getByText('loadError')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /retry/ }));

    await waitFor(() => expect(screen.getByText('Show ao vivo')).toBeInTheDocument());
  });

  it('loads the next page and merges it into the grouped list', async () => {
    mockedPage.mockImplementation(async ({ cursor }: { cursor?: string }) => {
      if (!cursor) return page([TODAY], { all: 2, unread: 2, shows: 1, tickets: 1, account: 0 }, 'cursor-2');
      return page([YESTERDAY], { all: 2, unread: 2, shows: 1, tickets: 1, account: 0 }, null);
    });
    const { wrapper } = makeWrapper();
    const user = userEvent.setup();
    render(<AccountNotificationsContent />, { wrapper });

    await screen.findByText('Show ao vivo');
    expect(screen.queryByText('Lembrete de ingresso')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /loadMore/ }));

    await waitFor(() => expect(screen.getByText('Lembrete de ingresso')).toBeInTheDocument());
    expect(screen.getByText('groups.today')).toBeInTheDocument();
    expect(screen.getByText('groups.yesterday')).toBeInTheDocument();
  });
});
