vi.mock('next-intl', () => ({ useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key) }));
const { toastFn } = vi.hoisted(() => ({ toastFn: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastFn }));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { EMPTY_STATE, type EditorState } from '../useEditorGraph';
import { useTour } from './useTour';

function options(overrides: Partial<Parameters<typeof useTour>[0]> = {}) {
  return {
    enabled: true,
    state: EMPTY_STATE as EditorState,
    analysisOk: null as boolean | null,
    published: false,
    active: false,
    blueprintId: 'b1',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('useTour', () => {
  it('starts at step 0 (firstIncompleteStep) on a fresh blueprint, with no resume toast', () => {
    const { result } = renderHook(() => useTour(options()));
    expect(result.current.visible).toBe(true);
    expect(result.current.step).toBe(0);
    expect(toastFn).not.toHaveBeenCalled();
  });

  it('resumes at firstIncompleteStep and shows a toast when a previous visit is on record', () => {
    // Only `skipped` is ever persisted — resume position always comes from
    // firstIncompleteStep, not a stored step number.
    localStorage.setItem('bp-tour:b1', JSON.stringify({ skipped: false }));
    const state = { ...EMPTY_STATE, nodes: [{ id: 't', node: 'wishlist.itemAdded', version: 1, config: { dedupeKey: 'x' }, position: { x: 0, y: 0 } }] };
    const { result } = renderHook(() => useTour(options({ state })));
    expect(result.current.step).toBe(2); // step 1 (dedupeKey) is filled in; step 2 (Esperar) isn't wired yet
    expect(toastFn).toHaveBeenCalledWith(expect.stringContaining('tour.resumedToast'));
  });

  it('does not render when a previous visit was skipped', () => {
    localStorage.setItem('bp-tour:b1', JSON.stringify({ skipped: true }));
    const { result } = renderHook(() => useTour(options()));
    expect(result.current.visible).toBe(false);
  });

  it('does not write to storage on mount, before any user action — only a real record already there is read', () => {
    renderHook(() => useTour(options()));
    expect(localStorage.getItem('bp-tour:b1')).toBeNull();
  });

  it('a fresh draft with no prior record shows no resume toast even though firstIncompleteStep is already > 0', () => {
    const state = { ...EMPTY_STATE, nodes: [{ id: 't', node: 'wishlist.itemAdded', version: 1, config: { dedupeKey: 'x' }, position: { x: 0, y: 0 } }] };
    const { result } = renderHook(() => useTour(options({ state })));
    // No stored record: this is genuinely the first visit, so it starts at
    // step 0 regardless of what the graph already has filled in.
    expect(result.current.step).toBe(0);
    expect(toastFn).not.toHaveBeenCalled();
  });

  it('next() only advances once the current step is checked, previous() always moves back', () => {
    const { result } = renderHook(() => useTour(options()));
    act(() => result.current.next()); // step 0's check() is always true
    expect(result.current.step).toBe(1);
    // The first real action is exactly when a record should first appear.
    expect(JSON.parse(localStorage.getItem('bp-tour:b1') ?? 'null')).toEqual({ skipped: false });
    act(() => result.current.next()); // step 1 needs a trigger node — still incomplete
    expect(result.current.step).toBe(1);
    act(() => result.current.previous());
    expect(result.current.step).toBe(0);
  });

  it('advanceAfterAutoApply() moves forward without waiting for a re-render check', () => {
    const { result } = renderHook(() => useTour(options()));
    act(() => result.current.next());
    expect(result.current.step).toBe(1);
    act(() => result.current.advanceAfterAutoApply());
    expect(result.current.step).toBe(2);
  });

  it('skip() hides the panel and persists across remounts', () => {
    const { result, rerender } = renderHook((props: ReturnType<typeof options>) => useTour(props), { initialProps: options() });
    act(() => result.current.skip());
    expect(result.current.visible).toBe(false);
    rerender(options());
    expect(JSON.parse(localStorage.getItem('bp-tour:b1') ?? '{}')).toEqual(expect.objectContaining({ skipped: true }));
  });

  it('completed is true once step 8 (analysisOk + published) checks out', () => {
    const { result } = renderHook(() => useTour(options({ analysisOk: true, published: true })));
    expect(result.current.completed).toBe(true);
  });

  it('does nothing when disabled', () => {
    const { result } = renderHook(() => useTour(options({ enabled: false })));
    expect(result.current.visible).toBe(false);
  });
});
