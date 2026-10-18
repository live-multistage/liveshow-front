vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
const mutate = vi.fn();
let stored: Record<string, boolean> = {};
vi.mock('../queries/get-notification-preferences', () => ({
  useNotificationPreferencesQuery: () => ({ data: stored }),
  useUpdateNotificationPreferencesMutation: () => ({ mutate, isPending: false }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPreferencesPanel } from './NotificationPreferencesPanel';

describe('NotificationPreferencesPanel', () => {
  beforeEach(() => {
    mutate.mockClear();
    stored = { LIVE_EVENTS: true, TICKET_REMINDERS: true, NEWS_PROMOS: true, EMAIL_DIGEST: true, CHAT_MENTIONS: true };
  });

  it('lists the chat mentions toggle with its description and NOVO chip', () => {
    render(<NotificationPreferencesPanel />);
    expect(screen.getByText('prefCHAT_MENTIONS')).toBeInTheDocument();
    expect(screen.getByText('prefCHAT_MENTIONSDesc')).toBeInTheDocument();
    expect(screen.getByText('prefCHAT_MENTIONSNew')).toBeInTheDocument();
  });

  it('defaults on when the stored map lacks CHAT_MENTIONS', () => {
    stored = { LIVE_EVENTS: true } as Record<string, boolean>;
    render(<NotificationPreferencesPanel />);
    expect(screen.getByRole('switch', { name: 'prefCHAT_MENTIONS' })).toHaveAttribute('aria-checked', 'true');
  });

  it('toggling calls the update mutation with CHAT_MENTIONS', async () => {
    render(<NotificationPreferencesPanel />);
    await userEvent.click(screen.getByRole('switch', { name: 'prefCHAT_MENTIONS' }));
    expect(mutate).toHaveBeenCalledWith({ CHAT_MENTIONS: false });
  });
});
