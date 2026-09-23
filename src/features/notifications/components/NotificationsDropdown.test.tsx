import { describe, it, expect, vi } from 'vitest';

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
vi.mock('../queries/get-notifications', () => ({
  useNotificationsQuery: () => ({ data: [], isLoading: false, isError: false }),
  useUnreadCountQuery: () => ({ data: 0 }),
}));
vi.mock('../mutations/mark-as-read.mutation', () => ({
  useMarkAllAsReadMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkAsReadMutation: () => ({ mutate: vi.fn() }),
}));

import { render, screen } from '@testing-library/react';
import { NotificationsDropdown } from './NotificationsDropdown';

describe('NotificationsDropdown', () => {
  it('points "Ver todas" at the account notifications screen', () => {
    render(<NotificationsDropdown />);

    const link = screen.getByText('Ver todas').closest('a');
    expect(link).toHaveAttribute('href', '/account/notifications');
  });
});
