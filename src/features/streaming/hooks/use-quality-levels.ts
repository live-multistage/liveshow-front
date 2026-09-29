'use client';

import { useState } from 'react';
import type { QualityLevel } from './use-hls-player';

export const AUTO_LEVEL = -1;

// The one quality vocabulary for analytics (playback_started.quality,
// quality_changed.from/to): 'auto' or '<height>p'. Deliberately lowercase and
// separate from `qualityLabel` below, which is UI copy ("Auto") shown in the
// quality menu trigger — analytics values and displayed text are allowed to
// diverge, but every analytics call site must agree with each other, so they
// all route through this one function instead of each computing their own
// string.
export function qualityAnalyticsLabel(level: number, levels: QualityLevel[]): string {
  if (level === AUTO_LEVEL) return 'auto';
  const found = levels.find((l) => l.index === level);
  return found ? `${found.height}p` : 'auto';
}

// ABR quality state shared by the live and replay players: the levels the
// primary panel reported, the viewer's selection (-1 = auto) and the label
// the quality button shows.
export function useQualityLevels() {
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);

  const activeLevel = levels.find((l) => l.index === currentLevel);
  const qualityLabel = currentLevel === -1 ? 'Auto' : activeLevel ? `${activeLevel.height}p` : 'Auto';

  return {
    levels,
    onLevelsReady: setLevels,
    currentLevel,
    onSelectLevel: setCurrentLevel,
    qualityLabel,
  };
}
