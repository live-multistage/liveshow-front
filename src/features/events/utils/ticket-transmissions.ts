import type { StageResponse, StreamResponse } from '@/features/streams';

export interface StageGroup {
  stream: StreamResponse;
  stages: StageResponse[];
}

// Stages offered by the ticket editor, grouped by transmission: only the
// selected transmissions (none selected = every one), in viewer order.
export function groupStagesByStream(
  streams: StreamResponse[],
  stages: StageResponse[],
  allowedStreamIds: string[],
): StageGroup[] {
  return [...streams]
    .sort((a, b) => a.position - b.position)
    .filter((s) => allowedStreamIds.length === 0 || allowedStreamIds.includes(s.id))
    .map((stream) => ({
      stream,
      stages: stages.filter((st) => st.streamId === stream.id).sort((a, b) => a.position - b.position),
    }))
    .filter((group) => group.stages.length > 0);
}

// Narrowing the transmissions drops stage picks outside them — a hidden,
// stale stage id would otherwise keep restricting the ticket.
export function pruneStagesOutsideStreams(
  allowedStageIds: string[],
  stages: StageResponse[],
  allowedStreamIds: string[],
): string[] {
  if (allowedStreamIds.length === 0) return allowedStageIds;
  const inScope = new Set(stages.filter((st) => allowedStreamIds.includes(st.streamId)).map((st) => st.id));
  return allowedStageIds.filter((id) => inScope.has(id));
}
