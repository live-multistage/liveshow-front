'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  PAGE_RESOLVE_DATA_MAX, resolvePageDataRequestSchema, walkElements, type PageElement, type PageResolvedData,
} from '@live-show/api-contracts';
import { pageKeys } from '../queries/page.keys';
import { pagesService } from '../services/pages.service';
import { toContractId } from './puck-data';

export const RESOLVE_DEBOUNCE_MS = 400;
export const EMPTY_RESOLVED: PageResolvedData = { rails: {}, featured: {}, live: {} };

type DataType = 'eventRail' | 'featuredEvent' | 'liveNow';
// What decides which events an element shows; style, anchor and visibility never do.
const RELEVANT: Record<DataType, readonly string[]> = { eventRail: ['source', 'limit'], featuredEvent: ['eventId'], liveNow: ['limit'] };
const isDataType = (type: string): type is DataType => type in RELEVANT;

interface Wanted { id: string; type: DataType; relevant: string }

/** The data elements of the page (Puck ids) with the props that matter to their data, as a comparable string. */
function wantedOf(content: readonly PageElement[]): Wanted[] {
  const wanted: Wanted[] = [];
  walkElements(content, (el) => {
    if (!isDataType(el.type)) return;
    const props = el.props as unknown as Record<string, unknown>;
    wanted.push({ id: String(props.id), type: el.type, relevant: JSON.stringify(RELEVANT[el.type].map((k) => props[k] ?? null)) });
  });
  return wanted;
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Elements the back accepts: it validates each one fully, and an incomplete one (no event chosen yet) would fail the whole call. */
function sendable(content: readonly PageElement[], wanted: readonly Wanted[]): PageElement[] {
  const ids = new Set(wanted.map((w) => w.id));
  const elements: PageElement[] = [];
  walkElements(content, (el) => {
    const props = el.props as unknown as { id: string };
    if (!ids.has(props.id)) return;
    const contract = { ...el, props: { ...el.props, id: toContractId(props.id) } } as PageElement;
    if (resolvePageDataRequestSchema.safeParse({ elements: [contract] }).success) elements.push(contract);
  });
  return elements;
}

const chunk = <T,>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

async function resolveAll(elements: readonly PageElement[]): Promise<PageResolvedData> {
  // One failed batch must not blank the others: keep what resolved. All failed = the query errors.
  const settled = await Promise.allSettled(chunk(elements, PAGE_RESOLVE_DATA_MAX).map((batch) => pagesService.resolveData(batch)));
  const parts = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const failed = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed && parts.length === 0) throw failed.reason;
  return parts.reduce<PageResolvedData>((all, part) => ({
    rails: { ...all.rails, ...part.rails }, featured: { ...all.featured, ...part.featured }, live: { ...all.live, ...part.live },
  }), EMPTY_RESOLVED);
}

export interface ResolveDataResult {
  /** Event data keyed by the element's Puck id: what the canvas renderers look up. */
  resolved: PageResolvedData;
  /** Data elements still waiting for their first answer (skeleton on the canvas). */
  loading: readonly string[];
  /** Data elements the back would refuse (no event chosen yet): whatever the saved draft had for them is stale. */
  unsendable: readonly string[];
}

/**
 * Real event data for the data elements as they are in the editor, saved or not. Debounced; one call per
 * `PAGE_RESOLVE_DATA_MAX` elements; the previous answer stays on screen while a new one is on its way.
 */
export function useResolveData(content: readonly PageElement[]): ResolveDataResult {
  const wanted = useMemo(() => wantedOf(content), [content]);
  const signature = useMemo(() => JSON.stringify(wanted.map((w) => [w.id, w.type, w.relevant])), [wanted]);
  const settledSignature = useDebounced(signature, RESOLVE_DEBOUNCE_MS);
  // The query runs for the debounced signature, with the content as it is when it runs.
  const latest = useRef(content);
  latest.current = content;
  const [querySignature, setQuerySignature] = useState(signature);
  useEffect(() => { if (settledSignature === signature) setQuerySignature(signature); }, [settledSignature, signature]);

  const query = useQuery({
    queryKey: [...pageKeys.all, 'resolve-data', querySignature],
    queryFn: () => resolveAll(sendable(latest.current, wantedOf(latest.current))),
    enabled: wanted.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const unsendable = useMemo(() => {
    const ok = new Set(sendable(content, wanted).map((el) => (el.props as { id: string }).id));
    return wanted.filter((w) => !ok.has(toContractId(w.id))).map((w) => w.id);
  }, [content, wanted]);

  return useMemo(() => {
    const data = query.data ?? EMPTY_RESOLVED;
    const resolved: PageResolvedData = { rails: {}, featured: {}, live: {} };
    const loading: string[] = [];
    const pending = querySignature !== signature || query.isFetching;
    wanted.forEach(({ id, type }) => {
      const key = toContractId(id);
      const bucket = type === 'eventRail' ? 'rails' : type === 'featuredEvent' ? 'featured' : 'live';
      if (key in data[bucket]) (resolved[bucket] as Record<string, unknown>)[id] = data[bucket][key];
      else if (pending) loading.push(id);
    });
    return { resolved, loading, unsendable };
  }, [query.data, query.isFetching, querySignature, signature, wanted, unsendable]);
}
