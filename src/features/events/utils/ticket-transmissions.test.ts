import { describe, it, expect } from 'vitest';
import { groupStagesByStream, pruneStagesOutsideStreams } from './ticket-transmissions';
import type { StageResponse, StreamResponse } from '@/features/streams';

const stream = (id: string, position: number): StreamResponse => ({
  id, eventId: 'e', programId: null, title: id, status: 'READY', position, createdAt: '2026-01-01', updatedAt: '2026-01-01',
});
const stage = (id: string, streamId: string, position = 0): StageResponse => ({
  id, streamId, name: id, slug: id, position, createdAt: '2026-01-01', updatedAt: '2026-01-01',
});
const streams = [stream('vip', 1), stream('main', 0)];
const stages = [stage('back', 'vip'), stage('palco', 'main'), stage('lounge', 'vip', 1)];

describe('groupStagesByStream', () => {
  it('groups stages under their transmission, in viewer order', () => {
    expect(groupStagesByStream(streams, stages, []).map((g) => [g.stream.id, g.stages.map((s) => s.id)])).toEqual([
      ['main', ['palco']],
      ['vip', ['back', 'lounge']],
    ]);
  });

  it('lists only the selected transmissions', () => {
    expect(groupStagesByStream(streams, stages, ['vip']).map((g) => g.stream.id)).toEqual(['vip']);
  });
});

describe('pruneStagesOutsideStreams', () => {
  it('drops stage picks that fell outside the selected transmissions', () => {
    expect(pruneStagesOutsideStreams(['palco', 'back'], stages, ['vip'])).toEqual(['back']);
  });

  it('keeps every pick when no transmission is selected (all)', () => {
    expect(pruneStagesOutsideStreams(['palco', 'back'], stages, [])).toEqual(['palco', 'back']);
  });

  it('a selection naming only deleted transmissions keeps no stage', () => {
    expect(pruneStagesOutsideStreams(['palco'], stages, ['deleted-stream'])).toEqual([]);
  });
});
