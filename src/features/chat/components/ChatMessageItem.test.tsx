vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatMessageItem } from './ChatMessageItem';
import type { ChatMessage } from '../types/chat.types';

// jsdom doesn't implement these — Radix DropdownMenu needs them to open.
beforeEach(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm1',
  eventId: 'evt-1',
  userId: 'user-2',
  authorName: 'Bob',
  body: 'oi',
  sentAt: '2026-01-01T00:00:00.000Z',
  streamId: null,
  authorUsername: null,
  mentions: [],
  authorInitials: 'BO',
  authorColor: '#46d6d8',
  ...overrides,
});

describe('ChatMessageItem', () => {
  it('shows no kebab for a non-moderator', () => {
    render(
      <ChatMessageItem
        message={message()}
        isModerator={false}
        currentUserId="user-1"
        onDelete={vi.fn()}
        onMute={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('moderator sees delete and mute for another user message', async () => {
    const user = userEvent.setup();
    render(
      <ChatMessageItem
        message={message({ userId: 'user-2' })}
        isModerator
        currentUserId="user-1"
        onDelete={vi.fn()}
        onMute={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button'));
    expect(await screen.findByRole('menuitem', { name: 'delete' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'muteUser:{"name":"Bob"}' })).toBeInTheDocument();
  });

  it('hides mute for the moderator own message and calls handlers with the right ids', async () => {
    const onDelete = vi.fn();
    const onMute = vi.fn();
    const user = userEvent.setup();
    render(
      <ChatMessageItem
        message={message({ id: 'm1', userId: 'user-1' })}
        isModerator
        currentUserId="user-1"
        onDelete={onDelete}
        onMute={onMute}
      />,
    );

    await user.click(screen.getByRole('button'));
    const deleteItem = await screen.findByRole('menuitem', { name: 'delete' });
    expect(screen.queryByRole('menuitem', { name: /muteUser/ })).not.toBeInTheDocument();

    await user.click(deleteItem);
    expect(onDelete).toHaveBeenCalledWith('m1');
    expect(onMute).not.toHaveBeenCalled();
  });
});

describe('ChatMessageItem — usernames and mentions', () => {
  it('shows the author @username next to the display name', () => {
    render(
      <ChatMessageItem message={message({ authorUsername: 'bob' })} isModerator={false} currentUserId="user-1" onDelete={vi.fn()} onMute={vi.fn()} />,
    );
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
  });

  it('shows no @handle when the author has no username (old accounts)', () => {
    render(
      <ChatMessageItem message={message({ authorUsername: null })} isModerator={false} currentUserId="user-1" onDelete={vi.fn()} onMute={vi.fn()} />,
    );
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.queryByText(/^@/)).not.toBeInTheDocument();
  });

  it('highlights only resolved mentions', () => {
    render(
      <ChatMessageItem
        message={message({ body: 'oi @Carla e @zé', mentions: [{ userId: 'user-3', username: 'carla' }] })}
        isModerator={false}
        currentUserId="user-1"
        onDelete={vi.fn()}
        onMute={vi.fn()}
      />,
    );
    expect(screen.getByText('@Carla')).toHaveAttribute('data-mention-user', 'user-3');
    expect(screen.queryByText('mentions.you')).not.toBeInTheDocument();
  });

  it('marks the whole row and shows the VOCÊ chip when the viewer is mentioned', () => {
    const { container } = render(
      <ChatMessageItem
        message={message({ body: 'valeu @ana.', mentions: [{ userId: 'user-1', username: 'ana' }] })}
        isModerator={false}
        currentUserId="user-1"
        onDelete={vi.fn()}
        onMute={vi.fn()}
      />,
    );
    expect(container.firstChild).toHaveAttribute('data-mentions-me', 'true');
    expect(screen.getByText('mentions.you')).toBeInTheDocument();
    expect(screen.getByText('@ana')).toHaveAttribute('data-mention-user', 'user-1');
  });

  it('an anonymous viewer never gets the own-mention row', () => {
    const { container } = render(
      <ChatMessageItem
        message={message({ body: '@ana', mentions: [{ userId: 'user-1', username: 'ana' }] })}
        isModerator={false}
        currentUserId={null}
        onDelete={vi.fn()}
        onMute={vi.fn()}
      />,
    );
    expect(container.firstChild).not.toHaveAttribute('data-mentions-me');
  });
});
