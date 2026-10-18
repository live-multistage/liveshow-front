import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from './ChatInput';
import type { ChatMe } from '../types/chat.types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/events/evt-1',
}));

const people = vi.hoisted(() => [
  { userId: 'u1', username: 'marina.v', displayName: 'Marina', avatarUrl: null },
  { userId: 'u2', username: 'mateus', displayName: 'Mateus', avatarUrl: null },
]);
vi.mock('../hooks/use-chat-participants', () => ({
  useChatParticipants: (_e: string, _s: string | null, q: string | null) =>
    q === null ? { data: undefined, isFetching: false, isSuccess: false } : { data: people, isFetching: false, isSuccess: true },
}));

const auth = { isLoggedIn: false };
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => auth,
}));

const mockTrack = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/tracking', () => ({ useAnalytics: () => ({ track: mockTrack }) }));

const me = (overrides: Partial<ChatMe> = {}): ChatMe => ({
  canWrite: true,
  isMuted: false,
  isModerator: false,
  ...overrides,
});

describe('ChatInput', () => {
  beforeEach(() => mockTrack.mockClear());

  it('logged in with no bootstrap yet shows a disabled "connecting" input, never the login link', () => {
    auth.isLoggedIn = true;
    render(<ChatInput eventId="evt-1" streamId={null} onSend={vi.fn()} me={null} />);
    const input = screen.getByPlaceholderText('connecting') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(screen.queryByText('login')).toBeNull();
    auth.isLoggedIn = false;
  });

  it('logged in without write access shows a disabled "unavailable" input', () => {
    auth.isLoggedIn = true;
    render(<ChatInput eventId="evt-1" streamId={null} onSend={vi.fn()} me={me({ canWrite: false })} />);
    expect((screen.getByPlaceholderText('unavailable') as HTMLInputElement).disabled).toBe(true);
    auth.isLoggedIn = false;
  });

  it('anonymous (me === null) shows the join link with returnTo/redirect to the current path', () => {
    render(<ChatInput eventId="evt-1" streamId={null} onSend={vi.fn()} me={null} />);

    expect(screen.getByText('joinToChat')).toBeInTheDocument();
    const link = screen.getByText('login');
    expect(link).toHaveAttribute('href', `/login?redirect=${encodeURIComponent('/events/evt-1')}`);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('muted disables the input with the muted placeholder', () => {
    render(<ChatInput eventId="evt-1" streamId={null} onSend={vi.fn()} me={me({ isMuted: true, canWrite: false })} />);

    const input = screen.getByPlaceholderText('muted');
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'send' })).toBeDisabled();
  });

  it('normal state sends the trimmed text and clears the input', () => {
    const onSend = vi.fn();
    render(<ChatInput eventId="evt-1" streamId={null} onSend={onSend} me={me()} />);

    const input = screen.getByPlaceholderText('placeholder');
    fireEvent.change(input, { target: { value: '  oi tudo bem  ' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(onSend).toHaveBeenCalledWith('oi tudo bem');
    expect(input).toHaveValue('');
    expect(mockTrack).toHaveBeenCalledWith('chat_message_sent', { eventId: 'evt-1' });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});

describe('ChatInput — mentions', () => {
  beforeEach(() => {
    auth.isLoggedIn = true;
  });

  it('is an accessible combobox that opens a listbox on @', async () => {
    const user = userEvent.setup();
    render(<ChatInput eventId="evt-1" streamId="s1" onSend={vi.fn()} me={me()} />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    await user.type(input, '@ma');

    expect(input).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox', { name: 'mentions.listLabel' });
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('names the combobox and only points aria-controls at the listbox while it is open', async () => {
    const user = userEvent.setup();
    render(<ChatInput eventId="evt-1" streamId="s1" onSend={vi.fn()} me={me()} />);
    const input = screen.getByRole('combobox', { name: 'placeholder' });
    expect(input).not.toHaveAttribute('aria-controls');
    await user.type(input, '@ma');
    expect(input).toHaveAttribute('aria-controls');
  });

  // Review Focus 4.
  it('Enter picks the active suggestion instead of sending; the next Enter sends', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput eventId="evt-1" streamId="s1" onSend={onSend} me={me()} />);
    const input = screen.getByRole('combobox');

    await user.type(input, 'oi @ma');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(onSend).not.toHaveBeenCalled();
    expect(input).toHaveValue('oi @mateus ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(onSend).toHaveBeenCalledWith('oi @mateus');
  });

  it('clicking a suggestion inserts it; Esc closes the list', async () => {
    const user = userEvent.setup();
    render(<ChatInput eventId="evt-1" streamId="s1" onSend={vi.fn()} me={me()} />);
    const input = screen.getByRole('combobox');

    await user.type(input, '@');
    await user.click(screen.getByRole('option', { name: 'mentions.optionLabel:{"username":"marina.v"}' }));
    expect(input).toHaveValue('@marina.v ');
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    expect(input).toHaveFocus();
    expect((input as HTMLInputElement).selectionStart).toBe('@marina.v '.length);

    await user.type(input, '@m');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('never opens for a muted viewer', async () => {
    const user = userEvent.setup();
    render(<ChatInput eventId="evt-1" streamId="s1" onSend={vi.fn()} me={me({ isMuted: true })} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('@');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
