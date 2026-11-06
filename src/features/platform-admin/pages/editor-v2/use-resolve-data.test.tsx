import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import fixture from '../../../../../shared/api-contracts/src/pages/page-tree-fixture.json';
import type { PageDocumentV2, PageElement, PageResolvedData } from '@live-show/api-contracts';

const resolveData = vi.hoisted(() => vi.fn());
vi.mock('../services/pages.service', () => ({ pagesService: { resolveData } }));

import { RESOLVE_DEBOUNCE_MS, useResolveData } from './use-resolve-data';

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const rail = (n: number, id = U(n)) => ({ type: 'eventRail', props: { id, title: 'Ao vivo', source: { kind: 'live' }, limit: 4 } }) as unknown as PageElement;
const featured = (n: number, eventId: string) => ({ type: 'featuredEvent', props: { id: U(n), eventId } }) as unknown as PageElement;
const section = (items: PageElement[]) => ({ type: 'section', props: { id: U(9999), items } }) as unknown as PageElement;
const events = (...ids: string[]) => ids.map((id) => ({ id, title: id, posterUrl: null, startsAt: null, isLive: false }));

let client: QueryClient;
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
const echo = (elements: { type: string; props: { id: string } }[]): PageResolvedData => ({
  rails: Object.fromEntries(elements.filter((e) => e.type === 'eventRail').map((e) => [e.props.id, events('a')])),
  featured: Object.fromEntries(elements.filter((e) => e.type === 'featuredEvent').map((e) => [e.props.id, null])),
  live: {},
});
const flush = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  resolveData.mockReset();
  resolveData.mockImplementation(async (elements) => echo(elements));
});
afterEach(() => vi.useRealTimers());

describe('useResolveData', () => {
  it('sends the data elements in batches of at most 20 (traversal through the contract helper, nested too)', async () => {
    const rails = Array.from({ length: 45 }, (_, i) => rail(i + 1));
    renderHook(() => useResolveData([section(rails)]), { wrapper });
    await flush(0);
    expect(resolveData.mock.calls.map(([batch]) => batch.length)).toEqual([20, 20, 5]);
  });

  it('finds the data elements of the 19-type fixture and ignores the other types', async () => {
    renderHook(() => useResolveData((fixture as unknown as PageDocumentV2).content as PageElement[]), { wrapper });
    await flush(0);
    const sent = resolveData.mock.calls.flatMap(([batch]) => batch.map((e: PageElement) => e.type)).sort();
    expect(sent).toEqual(['eventRail', 'featuredEvent', 'liveNow'].filter((t) => sent.includes(t)));
    expect(sent.length).toBeGreaterThan(0);
  });

  it('debounces: a burst of edits makes one call, for the last state', async () => {
    const { rerender } = renderHook(({ content }) => useResolveData(content), { wrapper, initialProps: { content: [section([rail(1)])] } });
    await flush(0);
    resolveData.mockClear();
    const edit = (limit: number) => [section([{ ...rail(1), props: { ...rail(1).props, limit } } as PageElement])];
    rerender({ content: edit(8) });
    await flush(100);
    rerender({ content: edit(12) });
    await flush(RESOLVE_DEBOUNCE_MS - 50);
    expect(resolveData).not.toHaveBeenCalled();
    await flush(100);
    expect(resolveData).toHaveBeenCalledTimes(1);
    expect(resolveData.mock.calls[0][0][0].props.limit).toBe(12);
  });

  it('style and visibility edits do not call again; they are not part of the key', async () => {
    const { rerender } = renderHook(({ content }) => useResolveData(content), { wrapper, initialProps: { content: [section([rail(1)])] } });
    await flush(0);
    resolveData.mockClear();
    rerender({ content: [section([{ ...rail(1), props: { ...rail(1).props, style: { desktop: { pt: 'md' } } } } as PageElement])] });
    await flush(RESOLVE_DEBOUNCE_MS + 50);
    expect(resolveData).not.toHaveBeenCalled();
  });

  it('keys the answer by the Puck id of the element (new nodes are "<type>-<uuid>") and sends the contract id', async () => {
    const puckId = `eventRail-${U(5)}`;
    const { result } = renderHook(() => useResolveData([section([rail(5, puckId)])]), { wrapper });
    await flush(0);
    expect(resolveData.mock.calls[0][0][0].props.id).toBe(U(5));
    expect(Object.keys(result.current.resolved.rails)).toEqual([puckId]);
  });

  it('skips an element the back would refuse (no event chosen yet) and keeps a null for an unavailable one', async () => {
    const { result } = renderHook(() => useResolveData([section([featured(1, ''), featured(2, U(77))])]), { wrapper });
    await flush(0);
    expect(resolveData.mock.calls[0][0].map((e: PageElement) => (e.props as { id: string }).id)).toEqual([U(2)]);
    expect(result.current.resolved.featured[U(2)]).toBeNull();
    expect(U(1) in result.current.resolved.featured).toBe(false);
  });

  it('reports the elements without an answer as loading until it arrives', async () => {
    let release!: (value: PageResolvedData) => void;
    resolveData.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const { result } = renderHook(() => useResolveData([section([rail(1)])]), { wrapper });
    await flush(0);
    expect(result.current.loading).toEqual([U(1)]);
    release({ rails: { [U(1)]: events('a') }, featured: {}, live: {} });
    await flush(0);
    expect(result.current.loading).toEqual([]);
    expect(result.current.resolved.rails[U(1)]).toHaveLength(1);
  });

  it('does not call at all without data elements', async () => {
    renderHook(() => useResolveData([section([])]), { wrapper });
    await flush(RESOLVE_DEBOUNCE_MS + 50);
    expect(resolveData).not.toHaveBeenCalled();
  });
});
