import { describe, it, expect, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

import { render, screen } from '@testing-library/react';
import { NotificationItem } from './NotificationItem';
import type { NotificationResponse } from '../types/notification.types';

describe('NotificationItem', () => {
  it('renders a COLLABORATION notification with a link', () => {
    const notification: NotificationResponse = {
      id: '1',
      type: 'COLLABORATION',
      title: 'Invited to collaborate',
      message: 'You have been invited to collaborate on this event',
      read: false,
      link: '/events/123',
      createdAt: new Date().toISOString(),
    };

    const onSelect = vi.fn();
    render(<NotificationItem notification={notification} onSelect={onSelect} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/events/123');
    expect(screen.getByText('Invited to collaborate')).toBeInTheDocument();
    expect(screen.getByText('You have been invited to collaborate on this event')).toBeInTheDocument();
  });

  it('renders other notification types correctly', () => {
    const notificationTypes = ['EVENT', 'TICKET', 'PAYMENT', 'SYSTEM', 'ADVERTISEMENT'] as const;

    notificationTypes.forEach((type) => {
      const notification: NotificationResponse = {
        id: '1',
        type,
        title: `${type} Notification`,
        message: 'Test message',
        read: false,
        link: null,
        createdAt: new Date().toISOString(),
      };

      const onSelect = vi.fn();
      const { unmount } = render(<NotificationItem notification={notification} onSelect={onSelect} />);

      expect(screen.getByText(`${type} Notification`)).toBeInTheDocument();
      unmount();
    });
  });
});
