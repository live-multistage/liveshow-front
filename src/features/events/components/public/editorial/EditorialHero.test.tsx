import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTranslator } from 'use-intl';
import { messages } from '@live-show/i18n-messages';

// Real ICU translator over the pt catalog (not a key-echo stub): the hero's
// plural ("1 câmera" / "3 câmeras") and interpolated strings can only be
// asserted meaningfully against actual message templates.
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) =>
    createTranslator({ locale: 'pt', messages: messages.pt, namespace: namespace as never }),
}));
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
  onImgError: () => {},
}));

import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
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
      render(<EditorialHero slides={[slide1, slide2, slide3]} />);

      expect(screen.getAllByRole('button', { name: /Ir para o slide/i })).toHaveLength(3);
      expect(screen.getAllByText('Slide One').length).toBeGreaterThan(0);
    });

    it('clicking a dot switches the active slide', () => {
      render(<EditorialHero slides={[slide1, slide2, slide3]} />);

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 3/i });
      fireEvent.click(dot2);

      expect(dot2).toHaveAttribute('aria-current', 'true');
    });

    it('advances automatically after 7s', () => {
      render(<EditorialHero slides={[slide1, slide2, slide3]} />);

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 3/i });
      expect(dot2).toHaveAttribute('aria-current', 'false');

      act(() => vi.advanceTimersByTime(7000));

      expect(dot2).toHaveAttribute('aria-current', 'true');
    });

    it('pauses autoplay on hover', () => {
      const { container } = render(<EditorialHero slides={[slide1, slide2, slide3]} />);

      const hero = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(hero);

      act(() => vi.advanceTimersByTime(7000));

      const dot1 = screen.getByRole('button', { name: /Ir para o slide 1 de 3/i });
      expect(dot1).toHaveAttribute('aria-current', 'true');
    });

    it('resets the autoplay dwell window on manual navigation', () => {
      render(<EditorialHero slides={[slide1, slide2, slide3]} />);

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
      render(<EditorialHero slides={[slide1]} />);

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

      render(<EditorialHero slides={[slide1, slide2, slide3]} />);

      act(() => vi.advanceTimersByTime(7000));

      const dot1 = screen.getByRole('button', { name: /Ir para o slide 1 de 3/i });
      expect(dot1).toHaveAttribute('aria-current', 'true');
    });
  });

  describe('teaser video', () => {
    const teaserUrl = 'https://example.com/teaser.mp4';
    const teaserSlide = makeShow({ id: 't1', title: 'Teaser Slide', teaserVideoUrl: teaserUrl });

    it('renders a video element on top of the poster when teaserVideoUrl is set', () => {
      const { container } = render(<EditorialHero slides={[teaserSlide, slide2, slide3]} />);

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
      const { container } = render(<EditorialHero slides={[slide1, slide2, slide3]} />);

      expect(container.querySelector('video')).toBeNull();
      expect(screen.getByAltText('Slide One')).toBeInTheDocument();
    });

    it('renders a video for a teaser on the single-slide (no-carousel) path too', () => {
      const { container } = render(<EditorialHero slides={[teaserSlide]} />);

      const video = container.querySelector('video');
      expect(video).not.toBeNull();
      expect(video?.autoplay).toBe(true);
    });

    it('pauses and resets the video when its slide becomes inactive', () => {
      const { container } = render(<EditorialHero slides={[teaserSlide, slide2, slide3]} />);

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
      const { container } = render(<EditorialHero slides={[teaserSlide]} />);

      const video = container.querySelector('video') as HTMLVideoElement;
      expect(video.className).not.toMatch(/VideoVisible/);

      fireEvent.loadedData(video);

      expect(video.className).toMatch(/VideoVisible/);
    });

    it('falls back to the static image (no video) if the teaser errors, without throwing', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { container } = render(<EditorialHero slides={[teaserSlide]} />);

      const video = container.querySelector('video') as HTMLVideoElement;
      fireEvent.error(video);

      expect(container.querySelector('video')).toBeNull();
      expect(screen.getByAltText('Teaser Slide')).toBeInTheDocument();
      // Silent fallback per spec — no console noise on a routine load failure.
      expect(errorSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it('uses the default 7s dwell while the teaser is still on its poster', () => {
      render(<EditorialHero slides={[teaserSlide, slide2]} />);

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 2/i });
      act(() => vi.advanceTimersByTime(7000));

      expect(dot2).toHaveAttribute('aria-current', 'true');
    });

    it('extends the dwell to ~35s while the teaser is actively playing', () => {
      const { container } = render(<EditorialHero slides={[teaserSlide, slide2]} />);

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
      const { container } = render(<EditorialHero slides={[teaserSlide, slide2]} />);

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

      const { container } = render(<EditorialHero slides={[teaserSlide, slide2, slide3]} />);

      expect(container.querySelector('video')).toBeNull();
      expect(screen.getByAltText('Teaser Slide')).toBeInTheDocument();
    });

    // Regression: the reduced-motion check used to resolve inside a
    // useEffect, so a server-rendered/first-pass render (before any effect
    // has run, before window.matchMedia is ever consulted) shipped a
    // <video autoPlay> for everyone, reduced-motion users included.
    // renderToString never runs effects, so it reproduces exactly that pass.
    it('never includes a <video> element in the pre-effect (SSR-equivalent) markup', () => {
      const html = renderToString(<EditorialHero slides={[teaserSlide, slide2, slide3]} />);

      expect(html).not.toContain('<video');
    });

    it('only preloads the active slide; inactive slides use preload="none"', () => {
      const { container } = render(<EditorialHero slides={[teaserSlide, slide2, slide3]} />);

      const activeVideo = container.querySelector('video') as HTMLVideoElement;
      expect(activeVideo).toHaveAttribute('preload', 'metadata');

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 3/i });
      fireEvent.click(dot2);

      // Slide 1 (now inactive) still renders its <video> (teaser stays
      // mounted), but must stop announcing itself as eager to fetch.
      const inactiveVideo = container.querySelector('video') as HTMLVideoElement;
      expect(inactiveVideo).toHaveAttribute('preload', 'none');
    });
  });
});

// Document outline: EditorialHero owns no heading at all. The page's single
// <h1> is rendered once by EditorialHome (outside the slide track), and each
// slide title is a plain <p> — a rotating carousel never changes the
// document outline and hidden slides never pose as sections.
describe('heading outline', () => {
  it('renders no h1/h2 inside the hero, in single- or multi-slide mode', () => {
    const { unmount } = render(<EditorialHero slides={[slide1, slide2, slide3]} />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getAllByText('Slide One').length).toBeGreaterThan(0);
    unmount();

    render(<EditorialHero slides={[slide1]} />);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByText('Slide One')).toBeInTheDocument();
  });
});

describe('inactive slide accessibility', () => {
  // `inert` is set imperatively (element.toggleAttribute), not via a JSX
  // prop — React 19 (the runtime Next 15 actually ships) warns on any
  // non-boolean `inert` prop value, so a console.error spy here is the
  // regression guard for that warning, not just an accessibility check.
  it('marks only the inactive slides inert and aria-hidden; the active slide is neither; no console warning', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<EditorialHero slides={[slide1, slide2, slide3]} />);

    // className is a CSS module hash in real builds but a passthrough string
    // in this test setup; select via the slide track's direct children
    // instead, which is layout-agnostic either way.
    const track = container.querySelector('[class*="heroV2Track"]') as HTMLElement;
    const slides = Array.from(track.children) as HTMLElement[];
    expect(slides).toHaveLength(3);

    expect(slides[0]).not.toHaveAttribute('inert');
    expect(slides[0]).not.toHaveAttribute('aria-hidden');
    expect(slides[1]).toHaveAttribute('inert');
    expect(slides[1]).toHaveAttribute('aria-hidden', 'true');
    expect(slides[2]).toHaveAttribute('inert');
    expect(slides[2]).toHaveAttribute('aria-hidden', 'true');

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('moves inert/aria-hidden to the previously-active slide after navigation; no console warning', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<EditorialHero slides={[slide1, slide2, slide3]} />);
    const track = container.querySelector('[class*="heroV2Track"]') as HTMLElement;

    fireEvent.click(screen.getByRole('button', { name: /Ir para o slide 2 de 3/i }));

    const slides = Array.from(track.children) as HTMLElement[];
    expect(slides[0]).toHaveAttribute('inert');
    expect(slides[0]).toHaveAttribute('aria-hidden', 'true');
    expect(slides[1]).not.toHaveAttribute('inert');
    expect(slides[1]).not.toHaveAttribute('aria-hidden');

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  // Regression: an earlier version applied `inert` from a useEffect keyed on
  // [index, count]. `heroSlides` is recomputed from live event data on every
  // parent render, so a show going live/ending can swap the Show at a given
  // index while count and index stay the same — React then mounts a *new*
  // DOM node (new `key={show.id}`) at that position, which an
  // [index, count]-effect never revisits, leaving it missing `inert`.
  it('keeps inert correct when the slides swap (new keys) at the same index and count', () => {
    const { container, rerender } = render(<EditorialHero slides={[slide1, slide2, slide3]} />);

    const slideD = makeShow({ id: 'd', title: 'Slide D' });
    const slideE = makeShow({ id: 'e', title: 'Slide E' });
    const slideF = makeShow({ id: 'f', title: 'Slide F' });
    rerender(<EditorialHero slides={[slideD, slideE, slideF]} />);

    const track = container.querySelector('[class*="heroV2Track"]') as HTMLElement;
    const slides = Array.from(track.children) as HTMLElement[];
    expect(slides).toHaveLength(3);

    expect(slides[0]).not.toHaveAttribute('inert');
    expect(slides[1]).toHaveAttribute('inert');
    expect(slides[2]).toHaveAttribute('inert');
  });
});

describe('i18n: cameras count plural', () => {
  it('renders singular for 1 camera and plural for 3 cameras', () => {
    const oneCam = makeShow({ id: 'one-cam', cameras: [cameras[0]] });
    const threeCams = makeShow({
      id: 'three-cam',
      cameras: [cameras[0], cameras[0], cameras[0]],
    });

    const { unmount } = render(<EditorialHero slides={[oneCam]} />);
    expect(screen.getByText('1 câmera')).toBeInTheDocument();
    unmount();

    render(<EditorialHero slides={[threeCams]} />);
    expect(screen.getByText('3 câmeras')).toBeInTheDocument();
  });
});

describe('i18n: dot aria-label', () => {
  it('formats the dot aria-label from the goToSlide message', () => {
    render(<EditorialHero slides={[slide1, slide2, slide3]} />);

    expect(screen.getByRole('button', { name: 'Ir para o slide 1 de 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para o slide 3 de 3' })).toBeInTheDocument();
  });
});

describe('i18n: free vs paid CTA', () => {
  it('shows "Explorar evento" for a numerically-free, non-live show', () => {
    const freeShow = makeShow({ id: 'free-1', isLive: false, price: 0 });
    render(<EditorialHero slides={[freeShow]} />);

    expect(screen.getByRole('link', { name: 'Explorar evento' })).toBeInTheDocument();
  });

  it('shows "Explorar evento" for a free priceRange (min and max both 0)', () => {
    const freeShow = makeShow({
      id: 'free-2',
      isLive: false,
      price: 0,
      priceRange: { min: 0, max: 0 },
    });
    render(<EditorialHero slides={[freeShow]} />);

    expect(screen.getByRole('link', { name: 'Explorar evento' })).toBeInTheDocument();
  });

  it('shows "Ingressos · <price>" for a paid, non-live show', () => {
    const paidShow = makeShow({ id: 'paid-1', isLive: false, price: 50 });
    render(<EditorialHero slides={[paidShow]} />);

    expect(screen.getByRole('link', { name: /Ingressos ·/ })).toBeInTheDocument();
  });
});
