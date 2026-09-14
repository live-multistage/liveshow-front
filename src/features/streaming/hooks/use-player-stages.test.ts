import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerStages, MAIN_STAGE_ID } from './use-player-stages';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const cam = (cameraId: string, priority: number) => ({ cameraId, priority });

describe('usePlayerStages', () => {
  it('synthesises one main stage, cameras sorted by priority, when the event has no stages', () => {
    const { result } = renderHook(() => usePlayerStages([cam('b', 2), cam('a', 1)], undefined, null));
    expect(result.current.stages).toHaveLength(1);
    expect(result.current.stages[0].stageId).toBe(MAIN_STAGE_ID);
    expect(result.current.stages[0].name).toBe('mainStage');
    expect(result.current.activeStage?.cameras.map((c) => c.cameraId)).toEqual(['a', 'b']);
  });

  it('sorts stages by position and their cameras by priority', () => {
    const stages = [
      { stageId: 's2', name: 'B', slug: 'b', position: 1, cameras: [cam('d', 9), cam('c', 3)] },
      { stageId: 's1', name: 'A', slug: 'a', position: 0, cameras: [cam('a', 1)] },
    ];
    const { result } = renderHook(() => usePlayerStages([], stages, null));
    expect(result.current.stages.map((s) => s.stageId)).toEqual(['s1', 's2']);
    expect(result.current.stages[1].cameras.map((c) => c.cameraId)).toEqual(['c', 'd']);
  });

  it('starts on the stage holding the primary camera, else the first non-empty one', () => {
    const stages = [
      { stageId: 'empty', name: 'E', slug: 'e', position: 0, cameras: [] },
      { stageId: 's1', name: 'A', slug: 'a', position: 1, cameras: [cam('a', 1)] },
      { stageId: 's2', name: 'B', slug: 'b', position: 2, cameras: [cam('b', 1)] },
    ];
    expect(renderHook(() => usePlayerStages([], stages, 'b')).result.current.activeStageId).toBe('s2');
    expect(renderHook(() => usePlayerStages([], stages, null)).result.current.activeStageId).toBe('s1');
  });

  it('switches the active stage', () => {
    const stages = [
      { stageId: 's1', name: 'A', slug: 'a', position: 0, cameras: [cam('a', 1)] },
      { stageId: 's2', name: 'B', slug: 'b', position: 1, cameras: [cam('b', 1)] },
    ];
    const { result } = renderHook(() => usePlayerStages([], stages, null));
    act(() => result.current.setActiveStageId('s2'));
    expect(result.current.activeStage?.stageId).toBe('s2');
  });
});
