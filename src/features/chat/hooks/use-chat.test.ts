import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/chat.service', () => ({
  chatService: {
    recent: vi.fn(),
    send: vi.fn(),
    react: vi.fn(),
    deleteMessage: vi.fn(),
    mute: vi.fn(),
    unmute: vi.fn(),
    streamUrl: vi.fn(
      (eventId: string, token: string | null) =>
        `http://api/chat/events/${eventId}/stream${token ? `?token=${token}` : ''}`,
    ),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'user-1', displayName: 'Ana' } }),
}));

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useChat } from './use-chat';
import { chatService } from '../services/chat.service';
import { tokenStore } from '@/lib/auth/token-store';

const mockedRecent = vi.mocked(chatService.recent);
const mockedSend = vi.mocked(chatService.send);
const mockedReact = vi.mocked(chatService.react);

type FakeSourceEvent = { data: string };

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  listeners: Record<string, Array<(e: FakeSourceEvent) => void>> = {};
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: (e: FakeSourceEvent) => void) {
    (this.listeners[type] ??= []).push(cb);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, data: unknown) {
    const event = { data: JSON.stringify(data) };
    this.listeners[type]?.forEach((cb) => cb(event));
  }
}

function latestSource(): FakeEventSource {
  const source = FakeEventSource.instances[FakeEventSource.instances.length - 1];
  if (!source) throw new Error('no EventSource created');
  return source;
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return { queryClient, wrapper };
}

const recentFixture = {
  messages: [
    {
      id: 'm1',
      eventId: 'evt-1',
      userId: 'user-2',
      authorName: 'Bob',
      body: 'oi',
      sentAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  me: { canWrite: true, isMuted: false, isModerator: false },
};

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    FakeEventSource.instances = [];
    (globalThis as unknown as { EventSource: typeof FakeEventSource }).EventSource = FakeEventSource;
    tokenStore.clear();
    mockedRecent.mockResolvedValue(recentFixture);
  });

  it('bootstrap seeds messages and me from the recent query', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChat('evt-1'), { wrapper });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    expect(result.current.messages[0]).toMatchObject({ id: 'm1', authorName: 'Bob' });
    expect(result.current.messages[0].authorInitials).toBe('BO');
    expect(result.current.me).toEqual(recentFixture.me);
  });

  it('appends a message event and dedupes the same id', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChat('evt-1'), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    const source = latestSource();
    const incoming = {
      id: 'm2',
      eventId: 'evt-1',
      userId: 'user-3',
      authorName: 'Caio',
      body: 'e ai',
      sentAt: '2026-01-01T00:00:01.000Z',
    };

    act(() => source.emit('message', incoming));
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    act(() => source.emit('message', incoming));
    expect(result.current.messages).toHaveLength(2);
  });

  it('removes a message on message.deleted', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChat('evt-1'), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    const source = latestSource();
    act(() => source.emit('message.deleted', { messageId: 'm1' }));

    await waitFor(() => expect(result.current.messages).toHaveLength(0));
  });

  it('replaces reactionCounts on a reactions event', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChat('evt-1'), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    const source = latestSource();
    act(() =>
      source.emit('reactions', { counts: { '💜': 3, '🔥': 1, '🤘': 0, '👏': 0, '✨': 0 } }),
    );

    await waitFor(() => expect(result.current.reactionCounts['💜']).toBe(3));
    expect(result.current.totalReactions).toBe(4);
  });

  it('muted flips me for the current user and ignores other users', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChat('evt-1'), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    const source = latestSource();

    act(() => source.emit('muted', { userId: 'someone-else', muted: true }));
    expect(result.current.me?.isMuted).toBe(false);

    act(() => source.emit('muted', { userId: 'user-1', muted: true }));
    await waitFor(() => expect(result.current.me?.isMuted).toBe(true));
    expect(result.current.me?.canWrite).toBe(false);
  });

  it('sendMessage with CHAT_RATE_LIMITED toasts and does not append the message', async () => {
    mockedSend.mockRejectedValue({
      isAxiosError: true,
      response: { status: 429, data: { code: 'CHAT_RATE_LIMITED', message: 'slow down' } },
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChat('evt-1'), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => result.current.sendMessage('hello'));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('rateLimited'));
    expect(result.current.messages).toHaveLength(1);
  });

  it('react increments the emoji count optimistically', async () => {
    mockedReact.mockResolvedValue(undefined);
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChat('evt-1'), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => result.current.react('🔥'));

    expect(result.current.reactionCounts['🔥']).toBe(1);
    expect(mockedReact).toHaveBeenCalledWith('evt-1', '🔥');
  });

  it('goes to reconnecting on stream error and back to live on reopen', async () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useChat('evt-1'), { wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    const firstSource = latestSource();
    act(() => firstSource.onopen?.());
    expect(result.current.status).toBe('live');

    vi.useFakeTimers();
    act(() => firstSource.onerror?.());
    expect(result.current.status).toBe('reconnecting');
    expect(firstSource.closed).toBe(true);

    // Anonymous (no token) reconnect skips the refresh round-trip and calls
    // connect() straight from the setTimeout callback.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    vi.useRealTimers();

    const secondSource = latestSource();
    expect(secondSource).not.toBe(firstSource);
    act(() => secondSource.onopen?.());
    expect(result.current.status).toBe('live');
  });
});
