'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

// The stage/camera shape both players agree on: live stages carry LiveCamera,
// replay stages carry ReplayCameraPlayback — only `cameraId`/`priority`
// matter here.
export interface PlayerStageLike<C extends { cameraId: string; priority: number }> {
  stageId: string;
  name: string;
  slug: string;
  position: number;
  cameras: C[];
}

export const MAIN_STAGE_ID = '__main__';

function initialStageId<C extends { cameraId: string; priority: number }>(
  stages: PlayerStageLike<C>[],
  primaryCameraId?: string | null,
): string {
  if (primaryCameraId) {
    const match = stages.find((s) => s.cameras.some((c) => c.cameraId === primaryCameraId));
    if (match) return match.stageId;
  }
  return stages.find((s) => s.cameras.length > 0)?.stageId ?? stages[0]?.stageId ?? MAIN_STAGE_ID;
}

// Stage model shared by live and replay: sorted stages (cameras by priority),
// or one synthetic main stage when the event has none; the active stage
// starts on the one holding the primary camera.
export function usePlayerStages<C extends { cameraId: string; priority: number }>(
  cameras: C[],
  rawStages: PlayerStageLike<C>[] | undefined,
  primaryCameraId?: string | null,
) {
  const t = useTranslations('player');
  const stages = useMemo<PlayerStageLike<C>[]>(() => {
    if (rawStages && rawStages.length > 0) {
      return [...rawStages]
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ ...s, cameras: [...s.cameras].sort((a, b) => a.priority - b.priority) }));
    }
    return [{ stageId: MAIN_STAGE_ID, name: t('mainStage'), slug: 'main', position: 0, cameras: [...cameras].sort((a, b) => a.priority - b.priority) }];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameras, rawStages]);

  const [activeStageId, setActiveStageId] = useState<string>(() => initialStageId(stages, primaryCameraId));
  const activeStage = stages.find((s) => s.stageId === activeStageId) ?? stages[0];

  return { stages, activeStage, activeStageId, setActiveStageId };
}
