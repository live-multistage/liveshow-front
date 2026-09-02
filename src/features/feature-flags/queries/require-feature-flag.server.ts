import { notFound } from 'next/navigation';
import { fetchFeatureFlags } from './get-feature-flags.server';
import type { FeatureFlagKey, FeatureFlags } from '../types/feature-flags.types';

// Server-only page/layout gate: 404s the segment when the flag is off.
// Returns the full flag set so callers that also need another flag (e.g.
// `chat`) don't have to fetch twice — fetchFeatureFlags is request-cached.
export async function requireFeatureFlag(key: FeatureFlagKey): Promise<FeatureFlags> {
  const flags = await fetchFeatureFlags();
  if (!flags[key]) notFound();
  return flags;
}
