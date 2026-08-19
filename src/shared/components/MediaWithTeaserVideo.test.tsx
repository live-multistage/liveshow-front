import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MediaWithTeaserVideo } from './MediaWithTeaserVideo';

const POSTER = 'https://example.com/poster.jpg';
const TEASER = 'https://example.com/teaser.mp4';

function mockMatchMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

describe('MediaWithTeaserVideo', () => {
  beforeEach(() => {
    mockMatchMedia(false);
    // jsdom doesn't implement real media playback.
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the poster only when no videoSrc is given', () => {
    const { container } = render(<MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" />);

    expect(screen.getByAltText('Poster')).toHaveAttribute('src', POSTER);
    expect(container.querySelector('video')).toBeNull();
  });

  it('layers a muted looping video over the poster when videoSrc is given', () => {
    const { container } = render(
      <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" videoSrc={TEASER} />,
    );

    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', TEASER);
    expect(video?.muted).toBe(true);
    expect(video?.loop).toBe(true);
    expect(video?.hasAttribute('playsinline')).toBe(true);
    // Poster stays mounted underneath.
    expect(screen.getByAltText('Poster')).toBeInTheDocument();
  });

  it('defaults to active: autoplays and preloads metadata', () => {
    const { container } = render(
      <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" videoSrc={TEASER} />,
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.autoplay).toBe(true);
    expect(video).toHaveAttribute('preload', 'metadata');
  });

  it('does not autoplay or eagerly preload when active is false', () => {
    const { container } = render(
      <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" videoSrc={TEASER} active={false} />,
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video.autoplay).toBe(false);
    expect(video).toHaveAttribute('preload', 'none');
  });

  it('pauses and rewinds the video when it becomes inactive', () => {
    const { container, rerender } = render(
      <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" videoSrc={TEASER} active />,
    );

    const video = container.querySelector('video') as HTMLVideoElement;
    video.currentTime = 9;
    const pauseSpy = window.HTMLMediaElement.prototype.pause as unknown as ReturnType<typeof vi.fn>;
    pauseSpy.mockClear();

    rerender(
      <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" videoSrc={TEASER} active={false} />,
    );

    expect(pauseSpy).toHaveBeenCalled();
    expect(video.currentTime).toBe(0);
  });

  it.each(['loadedData', 'canPlay', 'playing'] as const)(
    'swaps poster -> video on %s by applying the visible class',
    (event) => {
      const { container } = render(
        <MediaWithTeaserVideo
          posterSrc={POSTER}
          posterAlt="Poster"
          videoSrc={TEASER}
          videoClassName="base"
          videoVisibleClassName="visible"
        />,
      );

      const video = container.querySelector('video') as HTMLVideoElement;
      expect(video.className).toBe('base');

      fireEvent[event](video);

      expect(video.className).toBe('base visible');
    },
  );

  it('falls back silently to the poster when the video errors', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" videoSrc={TEASER} />,
    );

    fireEvent.error(container.querySelector('video') as HTMLVideoElement);

    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByAltText('Poster')).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  describe('reduced motion', () => {
    it('suppresses the video when reducedMotion is passed as true', () => {
      const { container } = render(
        <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" videoSrc={TEASER} reducedMotion />,
      );

      expect(container.querySelector('video')).toBeNull();
      expect(screen.getByAltText('Poster')).toBeInTheDocument();
    });

    it('suppresses the video when reducedMotion is passed as null (unresolved)', () => {
      const { container } = render(
        <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" videoSrc={TEASER} reducedMotion={null} />,
      );

      expect(container.querySelector('video')).toBeNull();
    });

    it('detects reduced motion internally when the prop is omitted', () => {
      mockMatchMedia(true);

      const { container } = render(
        <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" videoSrc={TEASER} />,
      );

      expect(container.querySelector('video')).toBeNull();
      expect(screen.getByAltText('Poster')).toBeInTheDocument();
    });

    // The internal check must resolve in an effect, never during render, or the
    // SSR/first pass ships a <video autoPlay> to reduced-motion users.
    it('never includes a <video> in the pre-effect (SSR-equivalent) markup', () => {
      const html = renderToString(
        <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" videoSrc={TEASER} />,
      );

      expect(html).not.toContain('<video');
    });
  });

  describe('onPhaseChange', () => {
    it('reports poster, then playing, then fallback', () => {
      const onPhaseChange = vi.fn();
      const { container } = render(
        <MediaWithTeaserVideo
          posterSrc={POSTER}
          posterAlt="Poster"
          videoSrc={TEASER}
          onPhaseChange={onPhaseChange}
        />,
      );

      expect(onPhaseChange).toHaveBeenLastCalledWith('poster');

      const video = container.querySelector('video') as HTMLVideoElement;
      fireEvent.loadedData(video);
      expect(onPhaseChange).toHaveBeenLastCalledWith('playing');

      fireEvent.error(video);
      expect(onPhaseChange).toHaveBeenLastCalledWith('fallback');
    });

    it('always reports poster when there is no video to play', () => {
      const onPhaseChange = vi.fn();
      render(
        <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" onPhaseChange={onPhaseChange} />,
      );

      expect(onPhaseChange).toHaveBeenCalledWith('poster');
    });

    it('renders fine when omitted', () => {
      const { container } = render(
        <MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" videoSrc={TEASER} />,
      );

      fireEvent.loadedData(container.querySelector('video') as HTMLVideoElement);

      expect(container.querySelector('video')).not.toBeNull();
    });
  });

  it('forwards poster load failures to posterOnError', () => {
    const onError = vi.fn();
    render(<MediaWithTeaserVideo posterSrc={POSTER} posterAlt="Poster" posterOnError={onError} />);

    fireEvent.error(screen.getByAltText('Poster'));

    expect(onError).toHaveBeenCalled();
  });
});
