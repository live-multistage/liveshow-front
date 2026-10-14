import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReplayChapter } from '../../types/live.types';
import { ChaptersDrawer } from './ChaptersDrawer';

// Echo keys with their params so copy that depends on data stays assertable.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
}));

const T0 = 1_000_000;
const MIN = 60_000;
const timeline = { startsAtMs: T0, endsAtMs: T0 + 120 * MIN };

const chapters: ReplayChapter[] = [
  { id: 'c1', stageId: null, title: 'Abertura dos portões', description: 'Público chegando.', artists: [], startsAtMs: T0, endsAtMs: T0 + 12 * MIN },
  {
    id: 'c3', stageId: 'stage-a', title: 'Banda Aurora', description: null,
    artists: [{ id: 'ar1', name: 'Banda Aurora', slug: 'banda-aurora' }],
    startsAtMs: T0 + 20 * MIN, endsAtMs: T0 + 40 * MIN,
  },
  { id: 'c4', stageId: null, title: 'Recado da organização', description: null, artists: [], startsAtMs: T0 + 40 * MIN, endsAtMs: T0 + 40 * MIN + 40_000 },
];

const goTo = (title: string, time: string) => `chapters.goTo ${JSON.stringify({ title, time })}`;

function renderDrawer(overrides: Partial<Parameters<typeof ChaptersDrawer>[0]> = {}) {
  const props = {
    open: true,
    chapters,
    positionMs: T0 + 27 * MIN + 14_000,
    timeline,
    stageNames: null,
    onSeek: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  return { ...render(<ChaptersDrawer {...props} />), props };
}

describe('ChaptersDrawer', () => {
  it('renders nothing while closed', () => {
    const { container } = renderDrawer({ open: false });
    expect(container.innerHTML).toBe('');
  });

  it('lists each chapter with its start relative to the replay, its length, title and description', () => {
    const { getByText, getByRole } = renderDrawer();
    expect(getByRole('complementary', { name: 'chapters.label' })).toBeTruthy();
    expect(getByText('3')).toBeTruthy(); // header count
    expect(getByText('0:20:00')).toBeTruthy();
    expect(getByText('chapters.durationMin {"count":12}')).toBeTruthy();
    expect(getByText('chapters.durationSec {"count":40}')).toBeTruthy();
    expect(getByText('Público chegando.')).toBeTruthy();
  });

  it('highlights only the chapter playing now', () => {
    const { getByRole, getAllByText, container } = renderDrawer();
    expect(getByRole('button', { name: goTo('Banda Aurora', '0:20:00') })).toHaveAttribute('aria-current', 'true');
    expect(container.querySelectorAll('[aria-current]')).toHaveLength(1);
    expect(getAllByText('chapters.nowPlaying')).toHaveLength(1);
  });

  it('highlights nothing while playing a stretch no chapter covers', () => {
    const { queryByText, container } = renderDrawer({ positionMs: T0 + 15 * MIN });
    expect(container.querySelector('[aria-current]')).toBeNull();
    expect(queryByText('chapters.nowPlaying')).toBeNull();
  });

  it('clicking a chapter seeks to its absolute start and keeps the drawer open', () => {
    const { getByRole, props } = renderDrawer();
    fireEvent.click(getByRole('button', { name: goTo('Recado da organização', '0:40:00') }));
    expect(props.onSeek).toHaveBeenCalledWith(T0 + 40 * MIN);
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('links artists to their page in a new tab without seeking', () => {
    const { getByRole, props } = renderDrawer();
    const link = getByRole('link', { name: /Banda Aurora/ });
    expect(link).toHaveAttribute('href', '/artists/banda-aurora');
    expect(link).toHaveAttribute('target', '_blank');
    fireEvent.click(link);
    expect(props.onSeek).not.toHaveBeenCalled();
  });

  it('tags stage-specific chapters only when the event has several stages', () => {
    const multi = renderDrawer({ stageNames: { 'stage-a': 'Palco A' } });
    expect(multi.getByText('Palco A')).toBeTruthy();
    multi.unmount();

    const single = renderDrawer({ stageNames: null });
    expect(single.queryByText('Palco A')).toBeNull();
  });

  it('leaves focus alone when the drawer closes with focus on another control', () => {
    const trigger = document.createElement('button');
    const other = document.createElement('button');
    document.body.append(trigger, other);
    trigger.focus();
    const { rerender, props } = renderDrawer();
    other.focus();
    rerender(<ChaptersDrawer {...props} open={false} />);
    expect(document.activeElement).toBe(other);
    trigger.remove();
    other.remove();
  });

  it('closes on Escape and on the close button', () => {
    const { getByLabelText, props } = renderDrawer();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(getByLabelText('chapters.close'));
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it('moves focus to the playing chapter on open and back to the trigger after Escape', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const { getByRole, rerender, props } = renderDrawer();
    expect(document.activeElement).toBe(getByRole('button', { name: goTo('Banda Aurora', '0:20:00') }));
    rerender(<ChaptersDrawer {...props} open={false} />);
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('focuses the close button when no chapter is playing', () => {
    const idle = renderDrawer({ positionMs: T0 + 15 * MIN });
    expect(document.activeElement).toBe(idle.getByLabelText('chapters.close'));
  });
});
