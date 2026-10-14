import type {
  ReplayChapter,
  ReplayChapterSuggestion,
  ReplayChapterSuggestionIssue,
  ReplayEventTimeline,
  ReplaceReplayChaptersRequest,
} from '@live-show/api-contracts';
import { formatClock } from '@/features/streaming/utils/chapter-track';

export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 500;

export interface ChapterDraft {
  key: string;
  startText: string;
  endText: string;
  title: string;
  description: string;
  stageId: string | null;
  artistIds: string[];
  importIssues: ReplayChapterSuggestionIssue[];
}

export type DraftError =
  | 'START_REQUIRED'
  | 'START_INVALID'
  | 'END_REQUIRED'
  | 'END_INVALID'
  | 'END_BEFORE_START'
  | 'AFTER_REPLAY'
  | 'TITLE_REQUIRED'
  | 'TITLE_TOO_LONG'
  | 'DESCRIPTION_TOO_LONG'
  | { code: 'OVERLAP'; withIndex: number };

export const formatOffset = formatClock;

const OFFSET_RE = /^(?:(\d+):([0-5]\d):([0-5]\d)|(\d+):([0-5]\d))$/;

export function parseOffset(text: string): number | null {
  const m = OFFSET_RE.exec(text.trim());
  if (!m) return null;
  const [h, min, s] = m[1] !== undefined ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, Number(m[4]), Number(m[5])];
  return ((h * 60 + min) * 60 + s) * 1000;
}

const spanOf = (w: ReplayEventTimeline) => w.endsAtMs - w.startsAtMs;

export function draftsFromChapters(chapters: ReplayChapter[], window: ReplayEventTimeline): ChapterDraft[] {
  const span = spanOf(window);
  return chapters.map((c) => ({
    key: c.id,
    startText: formatOffset(c.startsAtMs - window.startsAtMs, span),
    endText: formatOffset(c.endsAtMs - window.startsAtMs, span),
    title: c.title,
    description: c.description ?? '',
    stageId: c.stageId,
    artistIds: c.artists.map((a) => a.id),
    importIssues: [],
  }));
}

export function draftsFromSuggestions(suggestions: ReplayChapterSuggestion[], window: ReplayEventTimeline): ChapterDraft[] {
  const span = spanOf(window);
  return suggestions.map((s, i) => ({
    key: `${s.sourceScheduleItemId}:${i}`,
    startText: formatOffset(s.startsAtMs - window.startsAtMs, span),
    endText: s.endsAtMs === null ? '' : formatOffset(s.endsAtMs - window.startsAtMs, span),
    title: s.title,
    description: s.description ?? '',
    stageId: s.stageId,
    artistIds: s.artistIds,
    importIssues: s.issues,
  }));
}

interface Range {
  start: number;
  end: number;
}

function fieldErrors(d: ChapterDraft, span: number): { errors: DraftError[]; range: Range | null } {
  const errors: DraftError[] = [];
  const start = d.startText.trim() === '' ? null : parseOffset(d.startText);
  const end = d.endText.trim() === '' ? null : parseOffset(d.endText);

  if (d.startText.trim() === '') errors.push('START_REQUIRED');
  else if (start === null) errors.push('START_INVALID');
  if (d.endText.trim() === '') errors.push('END_REQUIRED');
  else if (end === null) errors.push('END_INVALID');

  let range: Range | null = null;
  if (start !== null && end !== null) {
    if (end <= start) errors.push('END_BEFORE_START');
    else if (end > span) errors.push('AFTER_REPLAY');
    else range = { start, end };
  } else if ((start !== null && start > span) || (end !== null && end > span)) {
    errors.push('AFTER_REPLAY');
  }

  const title = d.title.trim();
  if (!title) errors.push('TITLE_REQUIRED');
  else if (title.length > TITLE_MAX) errors.push('TITLE_TOO_LONG');
  if (d.description.trim().length > DESCRIPTION_MAX) errors.push('DESCRIPTION_TOO_LONG');

  return { errors, range };
}

// Two chapters conflict when some viewer would see both: whole-event
// (null) chapters are seen by everyone, stage chapters only on that stage.
const shareAudience = (a: string | null, b: string | null) => a === null || b === null || a === b;

export function validateDrafts(
  drafts: ChapterDraft[],
  window: ReplayEventTimeline,
  { multiStage }: { multiStage: boolean },
): DraftError[][] {
  const span = spanOf(window);
  const checked = drafts.map((d) => fieldErrors(d, span));
  const stageOf = (d: ChapterDraft) => (multiStage ? d.stageId : null);

  checked.forEach((a, i) => {
    if (!a.range) return;
    const j = checked.findIndex(
      (b, k) =>
        k !== i &&
        b.range !== null &&
        a.range!.start < b.range.end &&
        b.range.start < a.range!.end &&
        shareAudience(stageOf(drafts[i]), stageOf(drafts[k])),
    );
    if (j !== -1) a.errors.push({ code: 'OVERLAP', withIndex: j });
  });

  return checked.map((c) => c.errors);
}

// Only call once validateDrafts reported no errors.
export function toReplaceRequest(drafts: ChapterDraft[], window: ReplayEventTimeline): ReplaceReplayChaptersRequest {
  return {
    chapters: drafts.map((d) => ({
      stageId: d.stageId,
      startsAtMs: window.startsAtMs + (parseOffset(d.startText) ?? 0),
      endsAtMs: window.startsAtMs + (parseOffset(d.endText) ?? 0),
      title: d.title.trim(),
      description: d.description.trim() || null,
      artistIds: d.artistIds,
    })),
  };
}

export function serverErrorIndex(message: string): number | null {
  const m = /chapter at position (\d+):/.exec(message);
  return m ? Number(m[1]) : null;
}

// Rows with an unreadable start sink to the bottom so the one being typed
// doesn't jump around; Array.sort is stable, ties keep their order.
export function sortDraftsByStart(drafts: ChapterDraft[]): ChapterDraft[] {
  const startOf = (d: ChapterDraft) => parseOffset(d.startText) ?? Infinity;
  return [...drafts].sort((a, b) => {
    const x = startOf(a);
    const y = startOf(b);
    return x === y ? 0 : x < y ? -1 : 1;
  });
}
