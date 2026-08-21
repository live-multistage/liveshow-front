import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecommendedOverlay } from './RecommendedOverlay';
import { SCROLL_GESTURE_THRESHOLD } from '../hooks/use-scroll-gesture';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt',
}));

const h = vi.hoisted(() => ({
  query: vi.fn<(...args: unknown[]) => unknown>(),
}));

vi.mock('@/features/events/queries/use-recommended-events', () => ({
  useRecommendedEventsQuery: (...args: unknown[]) => h.query(...args),
}));

vi.mock('@/features/events/components/public/ShowCard', () => ({
  ShowCard: ({ show }: { show: { id: string; title: string } }) => <div data-testid="show-card">{show.title}</div>,
}));

vi.mock('@/features/events/utils/event-adapter', () => ({
  eventToShow: (e: { id: string; title: string }) => ({ id: e.id, title: e.title }),
}));

function setup(isFullscreen = true) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const containerRef = { current: container };
  const utils = render(
    <RecommendedOverlay eventId="ev-current" containerRef={containerRef} isFullscreen={isFullscreen} />,
  );
  // Name it distinctly: render()'s own `container` would shadow it in the spread.
  return { playerContainer: container, ...utils };
}

function wheel(el: HTMLElement, deltaY: number) {
  fireEvent(el, new WheelEvent('wheel', { deltaY }));
}

describe('RecommendedOverlay', () => {
  beforeEach(() => {
    h.query.mockReturnValue({
      data: { items: [{ id: 'ev-current', title: 'Atual' }, { id: 'ev-2', title: 'Outra live' }] },
    });
  });

  it('renders nothing outside fullscreen', () => {
    setup(false);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens the panel via chevron and excludes the current event', () => {
    setup();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByTestId('show-card')).toHaveLength(1);
    expect(screen.getByText('Outra live')).toBeTruthy();
    expect(screen.queryByText('Atual')).toBeNull();
  });

  it('only enables the query once opened', () => {
    setup();
    expect(h.query).toHaveBeenLastCalledWith(undefined, { enabled: false });
    fireEvent.click(screen.getByRole('button'));
    expect(h.query).toHaveBeenLastCalledWith(undefined, { enabled: true });
  });

  it('opens on scroll-down gesture and closes on scroll-up', () => {
    const { playerContainer } = setup();
    wheel(playerContainer, SCROLL_GESTURE_THRESHOLD);
    expect(screen.getByRole('region')).toBeTruthy();
    wheel(playerContainer, -SCROLL_GESTURE_THRESHOLD);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('shows the empty message when everything is filtered out', () => {
    h.query.mockReturnValue({ data: { items: [{ id: 'ev-current', title: 'Atual' }] } });
    setup();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('recommendedEmpty')).toBeTruthy();
  });
});
