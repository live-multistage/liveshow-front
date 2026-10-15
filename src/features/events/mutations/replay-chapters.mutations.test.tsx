import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/replay-chapters.service', () => ({
  replayChaptersService: { replace: vi.fn(), suggestions: vi.fn() },
}));

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { replayChaptersService } from '../services/replay-chapters.service';
import { replayChaptersEditorKey } from '../hooks/use-replay-chapters-editor';
import { LIVE_KEYS } from '@/features/streaming/queries/live.queries';
import { useReplaceReplayChaptersMutation, useReplayChapterSuggestionsMutation } from './replay-chapters.mutations';

const service = vi.mocked(replayChaptersService);

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, wrapper };
}

describe('replay chapters mutations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('replace stores the response and invalidates the player chapters', async () => {
    const response = { chapters: [], window: { startsAtMs: 1, endsAtMs: 2 } };
    service.replace.mockResolvedValue(response);
    const { qc, wrapper } = setup();
    qc.setQueryData(LIVE_KEYS.replayChapters('e1'), []);
    const { result } = renderHook(() => useReplaceReplayChaptersMutation('e1'), { wrapper });

    await act(() => result.current.mutateAsync({ chapters: [] }));

    expect(qc.getQueryData(replayChaptersEditorKey('e1'))).toEqual(response);
    expect(qc.getQueryState(LIVE_KEYS.replayChapters('e1'))?.isInvalidated).toBe(true);
  });

  it('suggestions fetches on demand', async () => {
    service.suggestions.mockResolvedValue([]);
    const { wrapper } = setup();
    const { result } = renderHook(() => useReplayChapterSuggestionsMutation('e1'), { wrapper });
    expect(service.suggestions).not.toHaveBeenCalled();

    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(service.suggestions).toHaveBeenCalledWith('e1');
  });
});
