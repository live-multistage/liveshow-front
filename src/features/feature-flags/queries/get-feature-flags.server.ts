import { cache } from 'react';
import type { FeatureFlags } from '../types/feature-flags.types';
import { DEFAULT_FEATURE_FLAGS } from '../types/feature-flags.types';

// Server-only, on purpose — flag resolution must never happen client-side.
// See docs/superpowers/specs/2026-07-03-feature-flags-design.md.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

export const fetchFeatureFlags = cache(async (): Promise<FeatureFlags> => {
  try {
    const res = await fetch(`${apiBase()}/feature-flags`, { next: { revalidate: 30 } });
    if (!res.ok) return DEFAULT_FEATURE_FLAGS;
    return (await res.json()) as FeatureFlags;
  } catch {
    return DEFAULT_FEATURE_FLAGS;
  }
});
