vi.mock('../mutations/mailing.mutations', () => ({ usePreviewMailingMutation: vi.fn() }));

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebouncedPreview } from './use-debounced-preview';
import { usePreviewMailingMutation } from '../mutations/mailing.mutations';

const draft = { name: 'P', category: 'MARKETING', subject: 'Oi', preheader: '', language: 'pt', blocks: [] } as const;
const mutate = vi.fn();

describe('useDebouncedPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mutate.mockReset();
    vi.mocked(usePreviewMailingMutation).mockReturnValue({ mutate, data: undefined, isError: false } as never);
  });
  afterEach(() => vi.useRealTimers());

  it('fires one request 500 ms after the last change, without the name', () => {
    const { rerender } = renderHook(({ d }) => useDebouncedPreview(d as never), { initialProps: { d: draft as object } });
    act(() => { vi.advanceTimersByTime(300); });
    rerender({ d: { ...draft, subject: 'Oi!' } });
    act(() => { vi.advanceTimersByTime(499); });
    expect(mutate).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({ category: 'MARKETING', subject: 'Oi!', preheader: '', language: 'pt', blocks: [] });
  });

  it('does not request while the draft is invalid and reports it', () => {
    const { result } = renderHook(() => useDebouncedPreview({ ...draft, subject: '' } as never));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.invalid).toBe(true);
  });
});
