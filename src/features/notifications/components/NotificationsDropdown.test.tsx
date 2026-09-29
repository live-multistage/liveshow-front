import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));
vi.mock('@live-show/design-system', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
let mockNotifications: unknown[] = [];
vi.mock('../queries/get-notifications', () => ({
  useNotificationsQuery: () => ({ data: mockNotifications, isLoading: false, isError: false }),
  useUnreadCountQuery: () => ({ data: 0 }),
}));
const markAsReadMutate = vi.fn();
vi.mock('../mutations/mark-as-read.mutation', () => ({
  useMarkAllAsReadMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkAsReadMutation: () => ({ mutate: markAsReadMutate }),
}));

const track = vi.fn();
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track }) }));

import { render, screen } from '@testing-library/react';
import { NotificationsDropdown } from './NotificationsDropdown';

describe('NotificationsDropdown', () => {
  beforeEach(() => {
    mockNotifications = [];
    vi.clearAllMocks();
  });

  it('points "Ver todas" at the account notifications screen', () => {
    render(<NotificationsDropdown />);

    const link = screen.getByText('Ver todas').closest('a');
    expect(link).toHaveAttribute('href', '/account/notifications');
  });

  it('tracks notification_clicked when a notification is selected', () => {
    mockNotifications = [
      { id: 'n1', type: 'EVENT', title: 'Show ao vivo', message: 'Começou', read: false, link: null, createdAt: new Date().toISOString() },
    ];
    render(<NotificationsDropdown />);

    screen.getByText('Show ao vivo').click();

    expect(track).toHaveBeenCalledWith('notification_clicked', { notificationId: 'n1', type: 'EVENT' });
    expect(markAsReadMutate).toHaveBeenCalledWith('n1');
  });
});
