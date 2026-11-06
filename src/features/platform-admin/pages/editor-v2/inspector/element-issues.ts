'use client';

import { createContext, useContext, useMemo } from 'react';
import { createUsePuck } from '@puckeditor/core';
import { validatePageAgainstProfile, validatePageTreeV2, type PageDocumentV2 } from '@live-show/api-contracts';
import { fromPuckData } from '../puck-data';
import { groupIssues, type ElementIssue } from './inspector-model';

const usePuck = createUsePuck();

/** Everything the editor can say about each element: contract validation plus the platform profile (the back is the authority). */
export const collectIssues = (doc: PageDocumentV2): Map<string, ElementIssue[]> =>
  groupIssues([...validatePageTreeV2(doc), ...validatePageAgainstProfile(doc, 'platform')]);

/** Issues that only the server knows (publish refusals), by element id: `{ [elementId]: { eventId: 'Evento indisponível' } }`. */
export type ServerIssues = Record<string, Record<string, string>>;
const ServerIssuesContext = createContext<ServerIssues>({});
export const ServerIssuesProvider = ServerIssuesContext.Provider;

/** Issues of one element (by contract id), recomputed only when the Puck data or the server issues change. */
export function useElementIssues(elementId: string): ElementIssue[] {
  const data = usePuck((s) => s.appState.data);
  const server = useContext(ServerIssuesContext);
  const all = useMemo(() => collectIssues(fromPuckData(data)), [data]);
  return useMemo(() => {
    const own = all.get(elementId) ?? [];
    const remote = Object.entries(server[elementId] ?? {}).map(([path, message]) => ({ path, message }));
    return [...remote, ...own];
  }, [all, server, elementId]);
}
