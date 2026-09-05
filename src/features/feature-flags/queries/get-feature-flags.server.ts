import * as React from 'react';
import type { FeatureFlags } from '../types/feature-flags.types';
import { DEFAULT_FEATURE_FLAGS } from '../types/feature-flags.types';

// Server-only, on purpose — flag resolution must never happen client-side.
// See docs/superpowers/specs/2026-07-03-feature-flags-design.md.
const apiBase = () =>
  (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

// React.cache only exists in the server build; client components that import
// this feature's barrel (e.g. under jsdom) would otherwise crash at import.
const memo: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof React.cache === 'function' ? React.cache : (fn) => fn;

export const fetchFeatureFlags = memo(async (): Promise<FeatureFlags> => {
  try {
    const res = await fetch(`${apiBase()}/feature-flags`, { next: { revalidate: 30 } });
    if (!res.ok) return DEFAULT_FEATURE_FLAGS;
    return (await res.json()) as FeatureFlags;
  } catch {
    return DEFAULT_FEATURE_FLAGS;
  }
});
