import type { Metadata } from 'next';
import { CreateEventPageContent } from '@/features/events';
import { fetchFeatureFlags } from '@/features/feature-flags';

export const metadata: Metadata = { title: 'Novo evento' };

export default async function CreateEventPage() {
  // vod_upload gates the VOD format option in the wizard — off means VOD events
  // can't be created (the backend enforces the same flag on create + upload).
  const flags = await fetchFeatureFlags();
  // physical_tickets is a per-org beta flag with no member-readable org
  // endpoint yet (TODO in get-feature-flags.server.ts) — fail open here
  // instead of hiding it for orgs where it's on via an override we can't see.
  return (
    <CreateEventPageContent
      vodUploadEnabled={flags.vod_upload}
      lowLatencyEnabled={flags.low_latency_mode}
      physicalTicketsEnabled
    />
  );
}
