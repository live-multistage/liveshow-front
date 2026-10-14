import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import type { ReplayChapter } from '../../types/live.types';
import { ChapterTrack } from './ChapterTrack';

const T0 = 1_000_000;
const MIN = 60_000;
const MAX = T0 + 120 * MIN; // 2-hour replay

const chapter = (id: string, title: string, startMin: number, endMin: number): ReplayChapter => ({
  id, stageId: null, title, description: null, artists: [],
  startsAtMs: T0 + startMin * MIN, endsAtMs: T0 + endMin * MIN,
});

const chapters = [
  chapter('c1', 'Abertura dos portões', 0, 12),
  chapter('c3', 'Banda Aurora', 20, 40),
  chapter('c5', 'Intervalo', 40, 55),
];

function renderTrack(value: number, onSeek = vi.fn(), max = MAX) {
  const utils = render(
    <ChapterTrack chapters={chapters} min={T0} max={max} value={value}>
      <input type="range" aria-label="seek" min={T0} max={max} value={value} onChange={(e) => onSeek(Number(e.target.value))} />
    </ChapterTrack>,
  );
  const track = utils.container.querySelector('[data-chapter-track]') as HTMLElement;
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 1000, top: 0, height: 20, right: 1000, bottom: 20, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
  return { ...utils, track, onSeek };
}

describe('ChapterTrack', () => {
  it('draws one segment per chapter plus neutral segments for uncovered stretches', () => {
    const { track } = renderTrack(T0);
    const kinds = Array.from(track.querySelectorAll('[data-kind]')).map((el) => el.getAttribute('data-kind'));
    expect(kinds).toEqual(['chapter', 'gap', 'chapter', 'chapter', 'gap']);
  });

  it('titles the chapter playing now', () => {
    const { getByText } = renderTrack(T0 + 27 * MIN + 14_000);
    expect(getByText('Banda Aurora')).toBeTruthy();
  });

  it('shows no title (not a dash) while playing a stretch no chapter covers', () => {
    const { queryByText, track } = renderTrack(T0 + 13 * MIN);
    expect(queryByText('Banda Aurora')).toBeNull();
    expect(track.textContent).not.toContain('—');
  });

  it('hovering shows the time and chapter under the cursor and thickens that segment', () => {
    const { track, getByRole, queryByRole } = renderTrack(T0);
    fireEvent.mouseMove(track, { clientX: 350 }); // 35 % of 2 h = 42 min → Intervalo

    const tooltip = getByRole('tooltip');
    expect(within(tooltip).getByText('0:42:00')).toBeTruthy();
    expect(within(tooltip).getByText('Intervalo')).toBeTruthy();
    const hot = track.querySelectorAll('[data-hot]');
    expect(hot).toHaveLength(1);
    expect(hot[0].getAttribute('data-kind')).toBe('chapter');

    fireEvent.mouseLeave(track);
    expect(queryByRole('tooltip')).toBeNull();
  });

  it('hovering an uncovered stretch shows only the time', () => {
    const { track, getByRole } = renderTrack(T0);
    fireEvent.mouseMove(track, { clientX: 125 }); // 15 min → gap
    const tooltip = getByRole('tooltip');
    expect(tooltip.textContent).toBe('0:15:00');
  });

  it('on touch, the tooltip follows the thumb only while dragging', () => {
    const { track, getByRole, queryByRole } = renderTrack(T0 + 27 * MIN + 14_000);
    expect(queryByRole('tooltip')).toBeNull();
    fireEvent.touchStart(track);
    expect(within(getByRole('tooltip')).getByText('0:27:14')).toBeTruthy();
    fireEvent.touchEnd(track);
    expect(queryByRole('tooltip')).toBeNull();
  });

  it('keeps the native range on top: its changes still reach the seek handler', () => {
    const { getByLabelText, onSeek } = renderTrack(T0);
    fireEvent.change(getByLabelText('seek'), { target: { value: String(T0 + 20 * MIN) } });
    expect(onSeek).toHaveBeenCalledWith(T0 + 20 * MIN);
  });

  it('floors a fractional window end so labels and the last segment are stable', () => {
    const { track, getByRole } = renderTrack(T0, vi.fn(), MAX + 0.6);
    fireEvent.mouseMove(track, { clientX: 1000 });
    expect(getByRole('tooltip').textContent).toBe('2:00:00');
    expect(track.querySelectorAll('[data-kind]')).toHaveLength(5);
  });
});
