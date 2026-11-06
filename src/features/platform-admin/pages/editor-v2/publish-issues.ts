import {
  validatePageAgainstProfile, validatePageTreeV2, type ElementType, type PageDocumentV2, type PageElement,
} from '@live-show/api-contracts';
import { idOf, pathTo } from './left/tree-ops';
import type { ServerIssues } from './inspector/element-issues';

export interface PublishIssue {
  /** Contract id of the element the issue belongs to; null when it belongs to the page. */
  elementId: string | null;
  type: ElementType | null;
  /** The top-level section holding the element (its name, or null when it has none). */
  sectionName: string | null;
  message: string;
}

/** Everything that keeps the page from being published: the contract and platform rules, plus what the back refused. */
export function listPublishIssues(doc: PageDocumentV2, server: ServerIssues = {}): PublishIssue[] {
  const content = doc.content as PageElement[];
  const raw = [...validatePageTreeV2(doc), ...validatePageAgainstProfile(doc, 'platform')]
    .map((issue) => ({ elementId: issue.elementId ?? null, message: issue.message }));
  Object.entries(server).forEach(([elementId, byField]) => Object.values(byField).forEach((message) => raw.unshift({ elementId, message })));

  const seen = new Set<string>();
  return raw.flatMap(({ elementId, message }) => {
    const key = `${elementId}|${message}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const path = elementId ? pathTo(content, elementId) : [];
    const name = (path[0]?.props as { name?: string } | undefined)?.name;
    return [{ elementId, type: (path.at(-1)?.type as ElementType | undefined) ?? null, sectionName: name || null, message }];
  });
}

