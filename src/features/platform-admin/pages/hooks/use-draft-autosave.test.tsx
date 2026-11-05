import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createEmptyDocument, createEmptySection, type PageDocument } from '@live-show/api-contracts';

vi.mock('../services/pages.service', () => ({
  pagesService: { saveDraft: vi.fn() },
  isDraftConflict: (e: { response?: { status?: number; data?: { code?: string } } }) =>
    e?.response?.status === 409 && e.response.data?.code === 'DRAFT_CONFLICT',
}));
import { pagesService } from '../services/pages.service';
import { useDraftAutosave } from './use-draft-autosave';

const saveDraft = vi.mocked(pagesService.saveDraft);
const ID = '11111111-1111-4111-8111-111111111111';
const docWith = (title: string, extra = false): PageDocument => {
  const d = createEmptyDocument();
  const s = createEmptySection('hero', ID);
  s.props = { ...s.props, title } as typeof s.props;
  return { ...d, sections: extra ? [s, createEmptySection('final', '22222222-2222-4222-8222-222222222222')] : [s] };
};
const ok = (n: number) => ({ draftRevision: n, draftUpdatedAt: '2026-11-05T00:00:00Z' });
const httpError = (status: number, data: unknown = {}) => ({ response: { status, data } });

function setup(initial: Partial<Parameters<typeof useDraftAutosave>[0]> = {}) {
  const onSaved = vi.fn();
  const onConflict = vi.fn();
  const props = { pageId: 'p1', document: docWith('a'), baseRevision: 1, dirty: true, onSaved, onConflict, ...initial };
  const hook = renderHook((p: typeof props) => useDraftAutosave(p), { initialProps: props });
  return { ...hook, props, onSaved, onConflict };
}

beforeEach(() => {
  vi.useFakeTimers();
  saveDraft.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('useDraftAutosave', () => {
  it('debounces 3 changes in 500ms into one save after 800ms', async () => {
    saveDraft.mockResolvedValue(ok(2));
    const { rerender, props, result, onSaved } = setup();
    for (const t of ['b', 'c', 'd']) {
      await act(async () => { await vi.advanceTimersByTimeAsync(160); });
      rerender({ ...props, document: docWith(t) });
    }
    expect(result.current.status.kind).toBe('pending');
    await act(async () => { await vi.advanceTimersByTimeAsync(799); });
    expect(saveDraft).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenCalledWith('p1', { document: docWith('d'), baseRevision: 1 });
    expect(result.current.status.kind).toBe('saved');
    expect(onSaved).toHaveBeenCalledWith({ ...ok(2), document: docWith('d') });
  });

  it('does not save when not dirty', async () => {
    const { result } = setup({ dirty: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(saveDraft).not.toHaveBeenCalled();
    expect(result.current.status.kind).toBe('idle');
  });

  it('reports invalid for {{ without a request', async () => {
    const { result } = setup({ document: docWith('oi {{x}}') });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(saveDraft).not.toHaveBeenCalled();
    const s = result.current.status;
    expect(s.kind).toBe('invalid');
    if (s.kind === 'invalid') expect(s.issues[0].path).toBe('sections.0.props.title');
  });

  it('chains revisions when the document changes while saving', async () => {
    let release!: (v: ReturnType<typeof ok>) => void;
    saveDraft.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    saveDraft.mockResolvedValueOnce(ok(3));
    const { rerender, props, result } = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(result.current.status.kind).toBe('saving');
    rerender({ ...props, document: docWith('z', true) });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    await act(async () => { release(ok(2)); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(saveDraft).toHaveBeenLastCalledWith('p1', { document: docWith('z', true), baseRevision: 2 });
    expect(result.current.status.kind).toBe('saved');
  });

  it('locks on 409 and never saves again', async () => {
    const conflict = { code: 'DRAFT_CONFLICT', currentRevision: 5, updatedBy: null, updatedAt: 'x' };
    saveDraft.mockRejectedValue(httpError(409, conflict));
    const { rerender, props, result, onConflict } = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(result.current.status).toEqual({ kind: 'conflict', conflict });
    expect(onConflict).toHaveBeenCalledTimes(1);
    rerender({ ...props, document: docWith('more') });
    act(() => result.current.saveNow());
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['409 PAGE_ARCHIVED', 409, { code: 'PAGE_ARCHIVED', message: 'Página arquivada' }],
    ['403 FEATURE_DISABLED', 403, { code: 'FEATURE_DISABLED', message: 'Recurso desativado' }],
    ['404', 404, { code: 'NOT_FOUND', message: 'Não encontrada' }],
    ['413', 413, { code: 'PAYLOAD_TOO_LARGE', message: 'Grande demais' }],
  ])('%s becomes blocked without retry', async (_name, status, data) => {
    saveDraft.mockRejectedValue(httpError(status, data));
    const { result, onConflict } = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(result.current.status).toEqual({ kind: 'blocked', code: data.code, message: data.message });
    expect(onConflict).not.toHaveBeenCalled();
    act(() => result.current.saveNow());
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it.each([408, 429, 503])('%i keeps retrying', async (status) => {
    saveDraft.mockRejectedValue(httpError(status));
    const { result } = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(result.current.status.kind).toBe('error');
  });

  it('a network error without response keeps retrying', async () => {
    saveDraft.mockRejectedValue(new Error('Network Error'));
    setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(800 + 2000); });
    expect(saveDraft).toHaveBeenCalledTimes(2);
  });

  it('still warns on beforeunload while blocked and dirty', async () => {
    saveDraft.mockRejectedValue(httpError(403, { code: 'FEATURE_DISABLED', message: 'x' }));
    const add = vi.spyOn(window, 'addEventListener');
    setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(add.mock.calls.some(([t]) => t === 'beforeunload')).toBe(true);
    add.mockRestore();
  });

  it('400 becomes invalid without retry', async () => {
    saveDraft.mockRejectedValue(httpError(400, { errors: [{ field: 'document.sections.0', message: 'ruim' }] }));
    const { result } = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(result.current.status).toEqual({ kind: 'invalid', issues: [{ path: 'document.sections.0', message: 'ruim' }] });
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it('400 without errors uses a generic issue', async () => {
    saveDraft.mockRejectedValue(httpError(400));
    const { result } = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(result.current.status).toEqual({
      kind: 'invalid',
      issues: [{ path: '', message: 'Não foi possível salvar: dados inválidos.' }],
    });
  });

  it('retries 5xx with backoff 2s then 4s', async () => {
    saveDraft.mockRejectedValue(httpError(500));
    const { result } = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(result.current.status).toMatchObject({ kind: 'error', attempt: 1 });
    await act(async () => { await vi.advanceTimersByTimeAsync(1999); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(result.current.status).toMatchObject({ kind: 'error', attempt: 2 });
    await act(async () => { await vi.advanceTimersByTimeAsync(3999); });
    expect(saveDraft).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(saveDraft).toHaveBeenCalledTimes(3);
  });

  it('saveNow skips the wait', async () => {
    saveDraft.mockResolvedValue(ok(2));
    const { result } = setup();
    act(() => result.current.saveNow());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  it('registers beforeunload while dirty and removes on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = setup();
    const call = add.mock.calls.find(([t]) => t === 'beforeunload');
    expect(call).toBeDefined();
    unmount();
    expect(remove).toHaveBeenCalledWith('beforeunload', call![1]);
  });

  it('an onSaved exception is not treated as a network error', async () => {
    saveDraft.mockResolvedValue(ok(2));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = setup({ onSaved: () => { throw new Error('boom'); } });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(result.current.status.kind).toBe('saved');
    spy.mockRestore();
  });

  it('returns pending to idle when dirty goes false without a save', async () => {
    const { rerender, props, result } = setup();
    expect(result.current.status.kind).toBe('pending');
    rerender({ ...props, dirty: false });
    expect(result.current.status.kind).toBe('idle');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('re-runs after a 400 when the document changed during the save', async () => {
    let reject!: (e: unknown) => void;
    saveDraft.mockImplementationOnce(() => new Promise((_, r) => { reject = r; }));
    saveDraft.mockResolvedValueOnce(ok(2));
    const { rerender, props, result } = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    rerender({ ...props, document: docWith('fixed') });
    await act(async () => { reject(httpError(400)); });
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(result.current.status.kind).toBe('saved');
  });

  it('saveNow is a no-op when clean and not in error', async () => {
    const { result } = setup({ dirty: false });
    act(() => result.current.saveNow());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it('never moves the revision backwards when baseRevision is stale', async () => {
    saveDraft.mockResolvedValueOnce(ok(5));
    saveDraft.mockResolvedValueOnce(ok(6));
    const { rerender, props } = setup();
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    rerender({ ...props, document: docWith('n'), baseRevision: 2 });
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    expect(saveDraft).toHaveBeenLastCalledWith('p1', { document: docWith('n'), baseRevision: 5 });
  });
});
