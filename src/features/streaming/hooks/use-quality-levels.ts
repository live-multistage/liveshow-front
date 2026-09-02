'use client';

import { useState } from 'react';
import type { QualityLevel } from './use-hls-player';

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
