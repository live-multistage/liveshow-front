// src/features/chat/hooks/use-mention-autocomplete.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { KeyboardEvent } from 'react';

const participantsState = vi.hoisted(() => ({
  data: undefined as unknown,
  isFetching: false,
  isSuccess: true,
}));
vi.mock('./use-chat-participants', () => ({ useChatParticipants: vi.fn(() => participantsState) }));

import { renderHook, act } from '@testing-library/react';
import { useMentionAutocomplete } from './use-mention-autocomplete';
import { useChatParticipants } from './use-chat-participants';

const people = [
  { userId: 'u1', username: 'marina.v', displayName: 'Marina', avatarUrl: null },
  { userId: 'u2', username: 'mateus', displayName: 'Mateus', avatarUrl: null },
];

function key(k: string) {
  return { key: k, preventDefault: vi.fn() } as unknown as KeyboardEvent<HTMLInputElement> & {
    preventDefault: ReturnType<typeof vi.fn>;
  };
}

function setup(value = 'oi @ma') {
  const onValueChange = vi.fn();
  const hook = renderHook(() => useMentionAutocomplete({ eventId: 'e1', streamId: 's1', value, onValueChange }));
  act(() => hook.result.current.track(value, value.length));
  return { ...hook, onValueChange };
}

beforeEach(() => {
  participantsState.data = people;
  participantsState.isFetching = false;
  participantsState.isSuccess = true;
});

describe('useMentionAutocomplete', () => {
  it('opens with the typed query, scoped to the room', () => {
    const { result } = setup();
    expect(result.current.open).toBe(true);
    expect(result.current.query).toBe('ma');
    expect(vi.mocked(useChatParticipants)).toHaveBeenLastCalledWith('e1', 's1', 'ma');
    expect(result.current.activeOptionId).toBe(result.current.optionId(0));
  });

  it('arrows cycle the active option', () => {
    const { result } = setup();
    act(() => result.current.onKeyDown(key('ArrowDown')));
    expect(result.current.activeIndex).toBe(1);
    act(() => result.current.onKeyDown(key('ArrowDown')));
    expect(result.current.activeIndex).toBe(0);
    act(() => result.current.onKeyDown(key('ArrowUp')));
    expect(result.current.activeIndex).toBe(1);
  });

  // Review Focus 4: Enter with the list open picks, it must not submit.
  it('Enter and Tab insert the active option and consume the key', () => {
    const { result, onValueChange } = setup();
    const enter = key('Enter');
    act(() => result.current.onKeyDown(enter));
    expect(enter.preventDefault).toHaveBeenCalled();
    expect(onValueChange).toHaveBeenCalledWith('oi @marina.v ', 13);
    expect(result.current.open).toBe(false);
  });

  it('Enter with no results is left alone (the message is sent)', () => {
    participantsState.data = [];
    const { result } = setup();
    const enter = key('Enter');
    act(() => result.current.onKeyDown(enter));
    expect(enter.preventDefault).not.toHaveBeenCalled();
    expect(result.current.empty).toBe(true);
  });

  it('Esc closes until the next keystroke re-tracks', () => {
    const { result } = setup();
    act(() => result.current.onKeyDown(key('Escape')));
    expect(result.current.open).toBe(false);
    act(() => result.current.track('oi @mat', 7));
    expect(result.current.open).toBe(true);
  });

  it('is closed when the caret is not in a mention', () => {
    const { result } = setup('oi pessoal');
    expect(result.current.open).toBe(false);
    expect(vi.mocked(useChatParticipants)).toHaveBeenLastCalledWith('e1', 's1', null);
  });

  it('reports loading while the first page is in flight', () => {
    participantsState.data = undefined;
    participantsState.isFetching = true;
    participantsState.isSuccess = false;
    const { result } = setup();
    expect(result.current.loading).toBe(true);
  });

  it('Tab picks the active option too', () => {
    const { result, onValueChange } = setup();
    const tab = key('Tab');
    act(() => result.current.onKeyDown(tab));
    expect(tab.preventDefault).toHaveBeenCalled();
    expect(onValueChange).toHaveBeenCalledWith('oi @marina.v ', 13);
  });

  it('Esc stays closed while the query is unchanged', () => {
    const { result } = setup();
    act(() => result.current.onKeyDown(key('Escape')));
    act(() => result.current.track('oi @ma', 6));
    expect(result.current.open).toBe(false);
  });

  it('select uses the latest tracked caret (mid-text)', () => {
    const { result, onValueChange } = setup('oi @ma tudo bem');
    act(() => result.current.track('oi @ma tudo bem', 6));
    act(() => result.current.select(people[1]));
    expect(onValueChange).toHaveBeenCalledWith('oi @mateus tudo bem', 11);
  });

  it('re-opens when the caret moves into a mention', () => {
    const { result } = setup('oi @ma tudo');
    act(() => result.current.track('oi @ma tudo', 11));
    expect(result.current.open).toBe(false);
    act(() => result.current.track('oi @ma tudo', 6));
    expect(result.current.open).toBe(true);
  });

  it('never opens or queries when disabled', () => {
    const onValueChange = vi.fn();
    const { result } = renderHook(() =>
      useMentionAutocomplete({ eventId: 'e1', streamId: 's1', value: 'oi @ma', onValueChange, enabled: false }),
    );
    act(() => result.current.track('oi @ma', 6));
    expect(result.current.open).toBe(false);
    expect(vi.mocked(useChatParticipants)).toHaveBeenLastCalledWith('e1', 's1', null);
  });

  it('exposes listbox wiring', () => {
    const { result } = setup();
    expect(result.current.listboxId).toBeTruthy();
    expect(result.current.optionId(1)).toContain(result.current.listboxId);
  });
});
