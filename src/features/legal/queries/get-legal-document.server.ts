import { cache } from 'react';
import type { LegalDocumentKind, LegalDocumentVersion, LegalDocumentVersionSummary } from '@live-show/api-contracts';

const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

// Fail-soft: the page renders an "unavailable" notice instead of 500ing.
async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${apiBase()}${path}`, { next: { tags: ['legal'], revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const fetchLegalDocument = cache((kind: LegalDocumentKind) => getJson<LegalDocumentVersion>(`/legal/${kind}`));
export const fetchLegalVersions = cache((kind: LegalDocumentKind) =>
  getJson<LegalDocumentVersionSummary[]>(`/legal/${kind}/versions`),
);
export const fetchLegalVersion = cache((kind: LegalDocumentKind, version: number) =>
  getJson<LegalDocumentVersion>(`/legal/${kind}/versions/${version}`),
);
