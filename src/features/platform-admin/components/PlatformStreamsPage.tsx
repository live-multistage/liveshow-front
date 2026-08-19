'use client';

import { StreamHealthCard } from '@/features/dashboard/components/StreamHealthCard';
import { PlatformPageShell } from './PlatformPageShell';

// D4 — Saúde dos streams. Reuses the overview StreamHealthCard (live count +
// transcode/ingest/failed counters, 5s refresh). The per-stream health/bitrate
// list is blocked until transcode_jobs carries event_id/bitrate.
export function PlatformStreamsPage() {
  return (
    <PlatformPageShell
      group="OPERACIONAL"
      title="Saúde dos streams"
      subtitle="Contadores em tempo real de transmissões, transcode e ingest. Lista por transmissão chega quando transcode_jobs expuser bitrate/health por variante."
    >
      <div style={{ maxWidth: 720 }}>
        <StreamHealthCard />
      </div>
    </PlatformPageShell>
  );
}
