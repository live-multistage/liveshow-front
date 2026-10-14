import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) => {
    const tag = vars?.n ?? vars?.name;
    return tag !== undefined ? `${key}:${tag}` : key;
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../hooks/use-replay-chapters-editor', () => ({ useReplayChaptersEditorQuery: vi.fn() }));
vi.mock('../../hooks/use-event-schedule', () => ({ useEventSchedule: vi.fn() }));
vi.mock('../../mutations/replay-chapters.mutations', () => ({
  useReplaceReplayChaptersMutation: vi.fn(),
  useReplayChapterSuggestionsMutation: vi.fn(),
}));
vi.mock('@/features/streams/queries/streams.queries', () => ({ useEventStagesQuery: vi.fn() }));
vi.mock('@/features/artists', () => ({ useEventLineup: vi.fn() }));

import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import type { ReplayChaptersResponse, ReplayChapterSuggestion } from '@live-show/api-contracts';
import { ReplayChaptersSection } from './ReplayChaptersSection';
import { useReplayChaptersEditorQuery } from '../../hooks/use-replay-chapters-editor';
import { useEventSchedule } from '../../hooks/use-event-schedule';
import {
  useReplaceReplayChaptersMutation,
  useReplayChapterSuggestionsMutation,
} from '../../mutations/replay-chapters.mutations';
import { useEventStagesQuery } from '@/features/streams/queries/streams.queries';
import { useEventLineup } from '@/features/artists';

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const HOUR = 3_600_000;
const START = 1_000_000;
const window = { startsAtMs: START, endsAtMs: START + 2 * HOUR };
const at = (offsetMs: number) => START + offsetMs;
const MIN = 60_000;

const chapter = (id: string, from: number, to: number, over: Record<string, unknown> = {}) => ({
  id,
  stageId: null,
  startsAtMs: at(from * MIN),
  endsAtMs: at(to * MIN),
  title: `Chapter ${id}`,
  description: null,
  artists: [],
  ...over,
});

const loaded = (chapters: ReplayChaptersResponse['chapters'], win = window): ReplayChaptersResponse => ({
  chapters,
  window: win,
});

const replaceAsync = vi.fn();
const suggestionsAsync = vi.fn();

function setup(response: ReplayChaptersResponse | undefined, opts: { stages?: number; schedule?: boolean } = {}) {
  asMock(useReplayChaptersEditorQuery).mockReturnValue({ data: response, isLoading: !response, isError: false });
  asMock(useEventSchedule).mockReturnValue({ data: opts.schedule === false ? [] : [{ id: 's1' }] });
  asMock(useEventStagesQuery).mockReturnValue({
    stages: Array.from({ length: opts.stages ?? 1 }, (_, i) => ({ id: `st${i + 1}`, name: `Stage ${i + 1}` })),
    isLoading: false,
  });
  asMock(useEventLineup).mockReturnValue({
    data: [
      { artist: { id: 'a1', name: 'Aurora' }, status: 'ACCEPTED' },
      { artist: { id: 'a2', name: 'Declined Dan' }, status: 'DECLINED' },
    ],
  });
  asMock(useReplaceReplayChaptersMutation).mockReturnValue({ mutateAsync: replaceAsync, isPending: false });
  asMock(useReplayChapterSuggestionsMutation).mockReturnValue({ mutateAsync: suggestionsAsync, isPending: false });
}

const renderSection = (props: { isVod?: boolean; readOnly?: boolean } = {}) =>
  render(<ReplayChaptersSection eventId="evt-1" isVod={props.isVod ?? false} readOnly={props.readOnly ?? false} />);

const starts = () => screen.getAllByLabelText('startLabel') as HTMLInputElement[];
const titles = () => screen.getAllByLabelText('titleLabel') as HTMLInputElement[];
const saveBtn = () => screen.getByRole('button', { name: 'save' });

beforeEach(() => {
  vi.clearAllMocks();
  replaceAsync.mockResolvedValue(loaded([]));
});

describe('ReplayChaptersSection', () => {
  it('renders one editable card per chapter with offsets relative to the replay start', () => {
    setup(loaded([chapter('1', 0, 12), chapter('2', 15, 20)]));
    renderSection();

    expect(starts().map((i) => i.value)).toEqual(['0:00:00', '0:15:00']);
    expect(titles().map((i) => i.value)).toEqual(['Chapter 1', 'Chapter 2']);
    expect(screen.getByText('clean')).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });

  it('shows the skeleton while loading', () => {
    setup(undefined);
    renderSection();
    expect(screen.getByTestId('chapters-loading')).toBeInTheDocument();
  });

  it('marks the form dirty after an edit and enables save', async () => {
    const user = userEvent.setup();
    setup(loaded([chapter('1', 0, 12)]));
    renderSection();

    await user.type(titles()[0], '!');

    expect(screen.getByText('dirty')).toBeInTheDocument();
    expect(saveBtn()).toBeEnabled();
  });

  it('blocks save and explains an invalid row', async () => {
    const user = userEvent.setup();
    setup(loaded([chapter('1', 0, 12), chapter('2', 15, 20)]));
    renderSection();

    await user.clear(titles()[1]);

    expect(screen.getByText('errTitleRequired')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(saveBtn()).toBeDisabled();
  });

  it('reports an overlap against the other chapter number', async () => {
    const user = userEvent.setup();
    setup(loaded([chapter('1', 0, 12), chapter('2', 15, 20)]));
    renderSection();

    const second = starts()[1];
    await user.clear(second);
    await user.type(second, '0:10:00');

    expect(screen.getAllByText(/^errOverlap:/).map((n) => n.textContent)).toContain('errOverlap:01');
    expect(saveBtn()).toBeDisabled();
  });

  it('re-sorts rows by start time when a start field loses focus', async () => {
    const user = userEvent.setup();
    setup(loaded([chapter('1', 0, 12), chapter('2', 15, 20)]));
    renderSection();

    const first = starts()[0];
    await user.clear(first);
    await user.type(first, '0:30:00');
    await user.tab();

    expect(titles().map((i) => i.value)).toEqual(['Chapter 2', 'Chapter 1']);
  });

  it('discard restores the last loaded chapters', async () => {
    const user = userEvent.setup();
    setup(loaded([chapter('1', 0, 12)]));
    renderSection();

    await user.type(titles()[0], 'zzz');
    await user.click(screen.getByRole('button', { name: 'discard' }));

    expect(titles()[0].value).toBe('Chapter 1');
    expect(screen.getByText('clean')).toBeInTheDocument();
  });

  it('removes a chapter and adds one starting where the last ends', async () => {
    const user = userEvent.setup();
    setup(loaded([chapter('1', 0, 12), chapter('2', 15, 20)]));
    renderSection();

    await user.click(screen.getAllByRole('button', { name: 'remove' })[0]);
    expect(titles()).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'add' }));
    expect(starts().map((i) => i.value)).toEqual(['0:15:00', '0:20:00']);
  });

  it('caps the chapter count at 200', () => {
    setup(loaded(Array.from({ length: 200 }, (_, i) => chapter(String(i), i / 2, i / 2 + 0.25))));
    renderSection();

    expect(screen.getByRole('button', { name: 'add' })).toBeDisabled();
    expect(screen.getByText('addLimit')).toBeInTheDocument();
    // 200 full cards are slow to mount in jsdom when the suite runs in parallel.
  }, 20_000);

  describe('save', () => {
    it('sends absolute offsets, stageId null on a single-stage event, and toasts success', async () => {
      const user = userEvent.setup();
      setup(loaded([chapter('1', 0, 12, { stageId: 'st1', artists: [{ id: 'a1', name: 'Aurora', slug: 'a' }] })]));
      renderSection();

      await user.type(titles()[0], '!');
      await user.click(saveBtn());

      await waitFor(() =>
        expect(replaceAsync).toHaveBeenCalledWith({
          chapters: [
            {
              stageId: null,
              startsAtMs: at(0),
              endsAtMs: at(12 * MIN),
              title: 'Chapter 1!',
              description: null,
              artistIds: ['a1'],
            },
          ],
        }),
      );
      expect(toast.success).toHaveBeenCalledWith('saved');
      expect(screen.getByText('clean')).toBeInTheDocument();
    });

    it('keeps the stage on a multi-stage event', async () => {
      const user = userEvent.setup();
      setup(loaded([chapter('1', 0, 12, { stageId: 'st2' })]), { stages: 2 });
      renderSection();

      await user.type(titles()[0], '!');
      await user.click(saveBtn());

      await waitFor(() => expect(replaceAsync).toHaveBeenCalled());
      expect(replaceAsync.mock.calls[0][0].chapters[0].stageId).toBe('st2');
    });

    it('hides the stage field on a single-stage event', () => {
      setup(loaded([chapter('1', 0, 12)]), { stages: 1 });
      renderSection();
      expect(screen.queryByLabelText('stageLabel')).not.toBeInTheDocument();
    });

    it('highlights the row the server names on a 400 and does not toast', async () => {
      const user = userEvent.setup();
      replaceAsync.mockRejectedValue({ status: 400, message: 'chapter at position 1: runs past the replay' });
      setup(loaded([chapter('1', 0, 12), chapter('2', 15, 20)]));
      renderSection();

      await user.type(titles()[0], '!');
      await user.click(saveBtn());

      const cards = await screen.findAllByRole('group', { name: /^chapterLabel/ });
      expect(within(cards[1]).getByText('runs past the replay')).toBeInTheDocument();
      expect(within(cards[0]).queryByText(/runs past/)).not.toBeInTheDocument();
      expect(toast.error).not.toHaveBeenCalled();
      expect(screen.getByText('dirty')).toBeInTheDocument();
    });

    it('toasts a generic failure and keeps the edits', async () => {
      const user = userEvent.setup();
      replaceAsync.mockRejectedValue({ status: 500, message: 'boom' });
      setup(loaded([chapter('1', 0, 12)]));
      renderSection();

      await user.type(titles()[0], '!');
      await user.click(saveBtn());

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('saveError'));
      expect(titles()[0].value).toBe('Chapter 1!');
    });

    it('switches to the unavailable state on 409', async () => {
      const user = userEvent.setup();
      replaceAsync.mockRejectedValue({ status: 409, message: 'no replay' });
      setup(loaded([chapter('1', 0, 12)]));
      renderSection();

      await user.type(titles()[0], '!');
      await user.click(saveBtn());

      expect(await screen.findByText('unavailableTitle')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument();
    });
  });

  describe('import from schedule', () => {
    const suggestion = (over: Partial<ReplayChapterSuggestion> = {}): ReplayChapterSuggestion => ({
      sourceScheduleItemId: 'si1',
      stageId: null,
      startsAtMs: at(20 * MIN),
      endsAtMs: at(40 * MIN),
      title: 'Aurora set',
      description: null,
      artistIds: ['a1'],
      issues: [],
      ...over,
    });

    it('imports straight away when there are no chapters, showing issue warnings', async () => {
      const user = userEvent.setup();
      suggestionsAsync.mockResolvedValue([suggestion({ issues: ['MULTI_STAGE'] })]);
      setup(loaded([]));
      renderSection();

      await user.click(screen.getByRole('button', { name: 'import' }));

      expect(await screen.findByDisplayValue('Aurora set')).toBeInTheDocument();
      expect(screen.getByText('warnMultiStage')).toBeInTheDocument();
      expect(screen.getByText('dirty')).toBeInTheDocument();
    });

    it('asks for confirmation before replacing existing chapters', async () => {
      const user = userEvent.setup();
      suggestionsAsync.mockResolvedValue([suggestion()]);
      setup(loaded([chapter('1', 0, 12)]));
      renderSection();

      await user.click(screen.getByRole('button', { name: 'import' }));
      const dialog = await screen.findByRole('dialog');
      expect(titles()[0].value).toBe('Chapter 1');

      await user.click(within(dialog).getByRole('button', { name: 'replaceConfirm' }));

      await waitFor(() => expect(titles()[0].value).toBe('Aurora set'));
      expect(titles()).toHaveLength(1);
    });

    it('keeps the existing chapters when the confirmation is cancelled', async () => {
      const user = userEvent.setup();
      suggestionsAsync.mockResolvedValue([suggestion()]);
      setup(loaded([chapter('1', 0, 12)]));
      renderSection();

      await user.click(screen.getByRole('button', { name: 'import' }));
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'replaceCancel' }));

      expect(titles()[0].value).toBe('Chapter 1');
    });

    it('offers no import without a schedule', () => {
      setup(loaded([]), { schedule: false });
      renderSection();
      expect(screen.queryByRole('button', { name: 'import' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'add' })).toBeInTheDocument();
    });

    it('toasts when the import request fails', async () => {
      const user = userEvent.setup();
      suggestionsAsync.mockRejectedValue({ status: 500, message: 'x' });
      setup(loaded([]));
      renderSection();

      await user.click(screen.getByRole('button', { name: 'import' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('importError'));
    });
  });

  describe('unavailable and read-only', () => {
    it('shows the processing state when the replay has no window yet', () => {
      setup({ chapters: [], window: null });
      renderSection();
      expect(screen.getByText('unavailableTitle')).toBeInTheDocument();
      expect(screen.getByText('unavailableBadge')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'add' })).not.toBeInTheDocument();
    });

    it('shows the VOD state without loading chapters', () => {
      setup(undefined);
      renderSection({ isVod: true });
      expect(screen.getByText('unavailableVod')).toBeInTheDocument();
      expect(useReplayChaptersEditorQuery).not.toHaveBeenCalled();
    });

    it('is read-only for users without edit permission', () => {
      setup(loaded([chapter('1', 0, 12, { artists: [{ id: 'a1', name: 'Aurora', slug: 'a' }] })]));
      renderSection({ readOnly: true });

      expect(screen.getByText('readOnly')).toBeInTheDocument();
      expect(screen.getByText('Chapter 1')).toBeInTheDocument();
      expect(screen.getByText('Aurora')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'save' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'import' })).not.toBeInTheDocument();
    });
  });

  it('only offers lineup artists that are not declined, and adds the picked one', async () => {
    const user = userEvent.setup();
    setup(loaded([chapter('1', 0, 12)]));
    renderSection();

    const picker = screen.getByLabelText('artistAdd') as HTMLSelectElement;
    expect(within(picker).queryByText('Declined Dan')).not.toBeInTheDocument();
    await user.selectOptions(picker, 'a1');

    expect(screen.getByRole('button', { name: 'artistRemove:Aurora' })).toBeInTheDocument();
    expect(screen.getByText('dirty')).toBeInTheDocument();
  });
});
