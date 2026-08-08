import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('./SmartImage', () => ({
  SmartImage: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));

import { render, screen, fireEvent, act } from '@testing-library/react';
import { EditorialHero } from './EditorialHero';
import type { Show, Camera } from '../../../types/show';

const cameras: Camera[] = [
  { id: 'cam1', name: 'Cam 1', angle: 'Front', color: '#fff', gradient: 'x' },
];

function makeShow(overrides: Partial<Show>): Show {
  return {
    id: 'show-1',
    title: 'Slide One',
    artist: 'Artist',
    category: 'Rock',
    venue: 'Arena',
    city: 'City',
    country: 'Brasil',
    date: '2026-08-10',
    time: '20:00',
    duration: '2h',
    image: 'https://example.com/img.jpg',
    price: 0,
    currency: 'BRL',
    isLive: true,
    hasReplay: true,
    cameras,
    description: 'desc',
    tags: [],
    viewers: 100,
    ...overrides,
  };
}

const slide1 = makeShow({ id: 's1', title: 'Slide One' });
const slide2 = makeShow({ id: 's2', title: 'Slide Two' });
const slide3 = makeShow({ id: 's3', title: 'Slide Three' });

describe('EditorialHero', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
    // jsdom doesn't implement real media playback; stub so play()/pause()
    // don't log "not implemented" noise and behave predictably in tests.
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('multi-slide', () => {
    it('renders one dot per slide and shows the first slide title', () => {
      render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      expect(screen.getAllByRole('button', { name: /Ir para o slide/i })).toHaveLength(3);
      expect(screen.getByRole('heading', { name: 'Slide One' })).toBeInTheDocument();
    });

    it('clicking a dot switches the active slide', () => {
      render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 3/i });
      fireEvent.click(dot2);

      expect(dot2).toHaveAttribute('aria-current', 'true');
    });

    it('advances automatically after 7s', () => {
      render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 3/i });
      expect(dot2).toHaveAttribute('aria-current', 'false');

      act(() => vi.advanceTimersByTime(7000));

      expect(dot2).toHaveAttribute('aria-current', 'true');
    });

    it('pauses autoplay on hover', () => {
      const { container } = render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      const hero = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(hero);

      act(() => vi.advanceTimersByTime(7000));

      const dot1 = screen.getByRole('button', { name: /Ir para o slide 1 de 3/i });
      expect(dot1).toHaveAttribute('aria-current', 'true');
    });

    it('resets the autoplay dwell window on manual navigation', () => {
      render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      act(() => vi.advanceTimersByTime(4000));

      const dot3 = screen.getByRole('button', { name: /Ir para o slide 3 de 3/i });
      fireEvent.click(dot3);
      expect(dot3).toHaveAttribute('aria-current', 'true');

      // Original timer would have ticked at 7000ms (3000ms from here); if the
      // interval wasn't reset on manual nav, it would auto-advance now.
      act(() => vi.advanceTimersByTime(4000));
      expect(dot3).toHaveAttribute('aria-current', 'true');

      // Full dwell window since the manual nav has now elapsed.
      act(() => vi.advanceTimersByTime(3000));
      expect(dot3).toHaveAttribute('aria-current', 'false');
    });
  });

  describe('single-slide', () => {
    it('renders no dot buttons and does not autoplay', () => {
      render(<EditorialHero slides={[slide1]} localeCode="pt-BR" />);

      expect(screen.queryAllByRole('button', { name: /Ir para o slide/i })).toHaveLength(0);
      expect(screen.getByText('Slide One')).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(7000));

      expect(screen.getByText('Slide One')).toBeInTheDocument();
    });
  });

  describe('reduced motion', () => {
    it('disables autoplay when prefers-reduced-motion is set', () => {
      window.matchMedia = vi.fn().mockImplementation((q: string) => ({
        matches: q.includes('reduce'),
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }));

      render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      act(() => vi.advanceTimersByTime(7000));

      const dot1 = screen.getByRole('button', { name: /Ir para o slide 1 de 3/i });
      expect(dot1).toHaveAttribute('aria-current', 'true');
    });
  });

  describe('teaser video', () => {
    const teaserUrl = 'https://example.com/teaser.mp4';
    const teaserSlide = makeShow({ id: 't1', title: 'Teaser Slide', teaserVideoUrl: teaserUrl });

    it('renders a video element on top of the poster when teaserVideoUrl is set', () => {
      const { container } = render(<EditorialHero slides={[teaserSlide, slide2, slide3]} localeCode="pt-BR" />);

      const video = container.querySelector('video');
      expect(video).not.toBeNull();
      expect(video).toHaveAttribute('src', teaserUrl);
      expect(video?.muted).toBe(true);
      expect(video?.loop).toBe(true);
      expect(video?.hasAttribute('playsinline')).toBe(true);
      // Active slide (index 0) autoplays; inactive slides do not.
      expect(video?.autoplay).toBe(true);

      // Poster <img> stays mounted underneath the video.
      expect(screen.getByAltText('Teaser Slide')).toBeInTheDocument();
    });

    it('renders image-only, unchanged, when teaserVideoUrl is absent', () => {
      const { container } = render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      expect(container.querySelector('video')).toBeNull();
      expect(screen.getByAltText('Slide One')).toBeInTheDocument();
    });

    it('renders a video for a teaser on the single-slide (no-carousel) path too', () => {
      const { container } = render(<EditorialHero slides={[teaserSlide]} localeCode="pt-BR" />);

      const video = container.querySelector('video');
      expect(video).not.toBeNull();
      expect(video?.autoplay).toBe(true);
    });

    it('pauses and resets the video when its slide becomes inactive', () => {
      const { container } = render(<EditorialHero slides={[teaserSlide, slide2, slide3]} localeCode="pt-BR" />);

      const video = container.querySelector('video') as HTMLVideoElement;
      video.currentTime = 12;
      const pauseSpy = window.HTMLMediaElement.prototype.pause as unknown as ReturnType<typeof vi.fn>;
      pauseSpy.mockClear();

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 3/i });
      fireEvent.click(dot2);

      expect(pauseSpy).toHaveBeenCalled();
      expect(video.currentTime).toBe(0);
    });

    it('shows the poster until the video reports loadeddata, then swaps to playing', () => {
      const { container } = render(<EditorialHero slides={[teaserSlide]} localeCode="pt-BR" />);

      const video = container.querySelector('video') as HTMLVideoElement;
      expect(video.className).not.toMatch(/VideoVisible/);

      fireEvent.loadedData(video);

      expect(video.className).toMatch(/VideoVisible/);
    });

    it('falls back to the static image (no video) if the teaser errors, without throwing', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { container } = render(<EditorialHero slides={[teaserSlide]} localeCode="pt-BR" />);

      const video = container.querySelector('video') as HTMLVideoElement;
      fireEvent.error(video);

      expect(container.querySelector('video')).toBeNull();
      expect(screen.getByAltText('Teaser Slide')).toBeInTheDocument();
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it('uses the default 7s dwell while the teaser is still on its poster', () => {
      render(<EditorialHero slides={[teaserSlide, slide2]} localeCode="pt-BR" />);

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 2/i });
      act(() => vi.advanceTimersByTime(7000));

      expect(dot2).toHaveAttribute('aria-current', 'true');
    });

    it('extends the dwell to ~35s while the teaser is actively playing', () => {
      const { container } = render(<EditorialHero slides={[teaserSlide, slide2]} localeCode="pt-BR" />);

      const video = container.querySelector('video') as HTMLVideoElement;
      act(() => fireEvent.loadedData(video));

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 2/i });

      act(() => vi.advanceTimersByTime(34999));
      expect(dot2).toHaveAttribute('aria-current', 'false');

      act(() => vi.advanceTimersByTime(1));
      expect(dot2).toHaveAttribute('aria-current', 'true');
    });

    it('shortens the dwell to ~15s when the teaser fails and falls back to the image', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { container } = render(<EditorialHero slides={[teaserSlide, slide2]} localeCode="pt-BR" />);

      const video = container.querySelector('video') as HTMLVideoElement;
      act(() => fireEvent.error(video));

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 2/i });

      act(() => vi.advanceTimersByTime(14999));
      expect(dot2).toHaveAttribute('aria-current', 'false');

      act(() => vi.advanceTimersByTime(1));
      expect(dot2).toHaveAttribute('aria-current', 'true');

      errorSpy.mockRestore();
    });

    it('suppresses the video entirely under prefers-reduced-motion, showing only the poster', () => {
      window.matchMedia = vi.fn().mockImplementation((q: string) => ({
        matches: q.includes('reduce'),
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }));

      const { container } = render(<EditorialHero slides={[teaserSlide, slide2, slide3]} localeCode="pt-BR" />);

      expect(container.querySelector('video')).toBeNull();
      expect(screen.getByAltText('Teaser Slide')).toBeInTheDocument();
    });
  });
});
