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

// TODO(backend): this only ever reads the global flag set. Per-org overrides
// (e.g. physical_tickets, event_collaborations enabled for one org while
// globally off) are invisible here because /platform-admin/organizations/:id/flags
// is SUPER_ADMIN-only (see live-show-orchestrator platform-admin-organizations.controller.ts).
// Add a member-readable GET /organizations/:id/feature-flags and fetch it
// alongside this in an org-scoped resolver; until then, org-beta-flag gates
// fail open in the dashboard/checkin instead of hiding features that may be
// on for the current org (see CreateEventPage, DashboardEventDetailPage,
// CheckinLayout).
export const fetchFeatureFlags = memo(async (): Promise<FeatureFlags> => {
  try {
    const res = await fetch(`${apiBase()}/feature-flags`, { next: { revalidate: 30 } });
    if (!res.ok) return DEFAULT_FEATURE_FLAGS;
    return (await res.json()) as FeatureFlags;
  } catch {
    return DEFAULT_FEATURE_FLAGS;
  }
});
