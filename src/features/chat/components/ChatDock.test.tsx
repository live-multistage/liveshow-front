vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/events/evt-1' }));

vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => ({ isLoggedIn: false }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatDock } from './ChatDock';
import type { ChatStatus } from '../hooks/use-chat';
import type { ChatMe } from '../types/chat.types';

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const me: ChatMe = { canWrite: true, isMuted: false, isModerator: false };

function renderDock(status: ChatStatus) {
  return render(
    <ChatDock
      open
      onClose={vi.fn()}
      messages={[]}
      onSend={vi.fn()}
      onReact={vi.fn()}
      reactionCounts={{ '💜': 0, '🔥': 0, '🤘': 0, '👏': 0, '✨': 0 }}
      me={me}
      status={status}
      onDeleteMessage={vi.fn()}
      onMuteUser={vi.fn()}
      onUnmuteUser={vi.fn()}
      currentUserId="user-1"
    />,
  );
}

describe('ChatDock', () => {
  it('shows the reconnecting banner when status is reconnecting', () => {
    renderDock('reconnecting');
    expect(screen.getByText('reconnecting')).toBeInTheDocument();
  });

  it('hides the reconnecting banner when status is live', () => {
    renderDock('live');
    expect(screen.queryByText('reconnecting')).not.toBeInTheDocument();
  });

  it('hides the reconnecting banner when status is connecting', () => {
    renderDock('connecting');
    expect(screen.queryByText('reconnecting')).not.toBeInTheDocument();
  });
});
