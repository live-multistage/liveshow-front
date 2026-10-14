import { describe, it, expect } from 'vitest';
import {
  draftsFromChapters,
  draftsFromSuggestions,
  formatOffset,
  parseOffset,
  serverErrorIndex,
  toReplaceRequest,
  validateDrafts,
  type ChapterDraft,
} from './replay-chapter-drafts';

const HOUR = 3_600_000;
const window = { startsAtMs: 1_000_000, endsAtMs: 1_000_000 + 2 * HOUR };

const draft = (over: Partial<ChapterDraft> = {}): ChapterDraft => ({
  key: 'k',
  startText: '0:00:00',
  endText: '0:10:00',
  title: 'Intro',
  description: '',
  stageId: null,
  artistIds: [],
  importIssues: [],
  ...over,
});

describe('parseOffset / formatOffset', () => {
  it('parses M:SS, MM:SS and H:MM:SS', () => {
    expect(parseOffset('1:05')).toBe(65_000);
    expect(parseOffset('12:30')).toBe(750_000);
    expect(parseOffset(' 1:02:03 ')).toBe(3_723_000);
  });

  it.each(['', 'abc', '1', '1:5', '1:60', '1:02:60', '-1:00', '1:2:3:4', '1.5:00'])('rejects %j', (text) => {
    expect(parseOffset(text)).toBeNull();
  });

  it('round-trips', () => {
    expect(parseOffset(formatOffset(65_000, 2 * HOUR))).toBe(65_000);
    expect(parseOffset(formatOffset(65_000, 10 * 60_000))).toBe(65_000);
    expect(formatOffset(65_000, 2 * HOUR)).toBe('0:01:05');
    expect(formatOffset(65_000, 10 * 60_000)).toBe('1:05');
  });
});

describe('drafts builders', () => {
  it('draftsFromChapters converts absolute instants to offsets', () => {
    const [d] = draftsFromChapters(
      [
        {
          id: 'c1',
          stageId: 's1',
          startsAtMs: window.startsAtMs + 60_000,
          endsAtMs: window.startsAtMs + 120_000,
          title: 'A',
          description: null,
          artists: [{ id: 'a1', name: 'X', slug: 'x' }],
        },
      ],
      window,
    );
    expect(d).toMatchObject({ key: 'c1', startText: '0:01:00', endText: '0:02:00', description: '', stageId: 's1', artistIds: ['a1'], importIssues: [] });
  });

  it('draftsFromSuggestions leaves a null end empty and keeps issues', () => {
    const [d] = draftsFromSuggestions(
      [
        {
          sourceScheduleItemId: 'i1',
          stageId: null,
          startsAtMs: window.startsAtMs,
          endsAtMs: null,
          title: 'S',
          description: 'desc',
          artistIds: ['a1'],
          issues: ['NO_END_TIME'],
        },
      ],
      window,
    );
    expect(d).toMatchObject({ startText: '0:00:00', endText: '', description: 'desc', importIssues: ['NO_END_TIME'] });
  });
});

describe('validateDrafts', () => {
  const run = (drafts: ChapterDraft[], multiStage = true) => validateDrafts(drafts, window, { multiStage });

  it('accepts a valid draft', () => {
    expect(run([draft()])).toEqual([[]]);
  });

  it('flags required and invalid times', () => {
    expect(run([draft({ startText: '', endText: '' })])[0]).toEqual(['START_REQUIRED', 'END_REQUIRED']);
    expect(run([draft({ startText: 'x', endText: 'y' })])[0]).toEqual(['START_INVALID', 'END_INVALID']);
  });

  it('requires end after start', () => {
    expect(run([draft({ startText: '0:10:00', endText: '0:10:00' })])[0]).toEqual(['END_BEFORE_START']);
    expect(run([draft({ startText: '0:10:00', endText: '0:05:00' })])[0]).toEqual(['END_BEFORE_START']);
  });

  it('keeps times inside the replay span', () => {
    expect(run([draft({ startText: '1:59:00', endText: '2:00:01' })])[0]).toEqual(['AFTER_REPLAY']);
    expect(run([draft({ startText: '1:59:00', endText: '2:00:00' })])[0]).toEqual([]);
  });

  it('validates title and description', () => {
    expect(run([draft({ title: '   ' })])[0]).toEqual(['TITLE_REQUIRED']);
    expect(run([draft({ title: 'a'.repeat(121) })])[0]).toEqual(['TITLE_TOO_LONG']);
    expect(run([draft({ title: 'a'.repeat(120) })])[0]).toEqual([]);
    expect(run([draft({ description: 'a'.repeat(501) })])[0]).toEqual(['DESCRIPTION_TOO_LONG']);
  });

  describe('overlap', () => {
    const a = draft({ key: 'a', startText: '0:00:00', endText: '0:10:00' });
    const b = draft({ key: 'b', startText: '0:05:00', endText: '0:15:00' });

    it('rejects overlapping whole-event chapters on both rows', () => {
      expect(run([a, b])).toEqual([[{ code: 'OVERLAP', withIndex: 1 }], [{ code: 'OVERLAP', withIndex: 0 }]]);
    });

    it('allows touching edges', () => {
      expect(run([a, { ...b, startText: '0:10:00' }])).toEqual([[], []]);
    });

    it('allows the same time on different stages', () => {
      expect(run([{ ...a, stageId: 'A' }, { ...b, stageId: 'B' }])).toEqual([[], []]);
    });

    it('rejects the same stage and whole-event x stage', () => {
      expect(run([{ ...a, stageId: 'A' }, { ...b, stageId: 'A' }])[0]).toHaveLength(1);
      expect(run([a, { ...b, stageId: 'B' }])[0]).toHaveLength(1);
    });

    it('ignores stages when the event is not multi-stage', () => {
      expect(run([{ ...a, stageId: 'A' }, { ...b, stageId: 'B' }], false)[0]).toHaveLength(1);
    });
  });
});

describe('toReplaceRequest', () => {
  it('converts offsets to absolute ms, trims and nulls empty descriptions', () => {
    const req = toReplaceRequest(
      [draft({ startText: '0:01:00', endText: '0:02:00', title: '  Hi ', description: '  ', stageId: 's1', artistIds: ['a1'] })],
      window,
    );
    expect(req).toEqual({
      chapters: [
        {
          stageId: 's1',
          startsAtMs: window.startsAtMs + 60_000,
          endsAtMs: window.startsAtMs + 120_000,
          title: 'Hi',
          description: null,
          artistIds: ['a1'],
        },
      ],
    });
  });
});

describe('serverErrorIndex', () => {
  it('parses the position from the backend message', () => {
    expect(serverErrorIndex('chapter at position 3: end must be after start')).toBe(3);
    expect(serverErrorIndex('something else')).toBeNull();
  });
});
