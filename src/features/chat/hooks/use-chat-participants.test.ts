import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/chat.service', () => ({ chatService: { participants: vi.fn() } }));

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { chatService } from '../services/chat.service';
import { useChatParticipants } from './use-chat-participants';

const participants = vi.mocked(chatService.participants);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => participants.mockReset());

describe('useChatParticipants', () => {
  it('does not fetch while no mention is being typed', async () => {
    renderHook(() => useChatParticipants('e1', 's1', null), { wrapper });
    await new Promise((r) => setTimeout(r, 200));
    expect(participants).not.toHaveBeenCalled();
  });

  it('fetches the debounced query for the room, including the empty query of a bare @', async () => {
    participants.mockResolvedValue([{ userId: 'u2', username: 'bia', displayName: 'Bia', avatarUrl: null }]);
    const { result } = renderHook(() => useChatParticipants('e1', 's1', ''), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(participants).toHaveBeenCalledWith('e1', '', 's1');
  });
});
