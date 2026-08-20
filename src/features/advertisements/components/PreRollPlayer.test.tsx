import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { PreRollPlayer } from './PreRollPlayer';
import { advertisementsService } from '../services/advertisements.service';
import type { ServedAd } from '../types/advertisement.types';

vi.mock('../services/advertisements.service', () => ({
  advertisementsService: {
    serve: vi.fn(),
    recordImpression: vi.fn(),
    recordClick: vi.fn(),
  },
}));

const mockedService = vi.mocked(advertisementsService);

const videoAd: ServedAd = {
  adId: 'ad-1',
  title: 'Great Video Ad',
  format: 'WIDE_16_9',
  advertiserAccountId: 'acc-1',
  destination: { type: 'EVENT', eventId: 'evt-1' },
  bannerUrl: null,
  videoUrl: 'https://cdn.example.com/ad.mp4',
  videoDurationSec: 15,
};

describe('PreRollPlayer', () => {
  let onFinished: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    onFinished = vi.fn<() => void>();
    // jsdom throws "not implemented" for HTMLMediaElement.play()
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('fires impression once on playing', () => {
    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    fireEvent(screen.getByTestId('preroll-video'), new Event('playing'));
    fireEvent(screen.getByTestId('preroll-video'), new Event('playing'));
    expect(mockedService.recordImpression).toHaveBeenCalledTimes(1);
    expect(mockedService.recordImpression).toHaveBeenCalledWith('ad-1', 'PRE_ROLL');
  });

  it('hides skip before 5s of playback, shows it after', () => {
    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    fireEvent(screen.getByTestId('preroll-video'), new Event('playing'));
    expect(screen.queryByRole('button', { name: /pular/i })).toBeNull();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole('button', { name: /pular/i })).toBeInTheDocument();
  });

  it('onFinished on skip click', () => {
    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    fireEvent(screen.getByTestId('preroll-video'), new Event('playing'));
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole('button', { name: /pular/i }));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('onFinished on video ended', () => {
    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    fireEvent(screen.getByTestId('preroll-video'), new Event('ended'));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('onFinished on video error', () => {
    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    fireEvent(screen.getByTestId('preroll-video'), new Event('error'));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('onFinished fires only once across ended+skip', () => {
    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    fireEvent(screen.getByTestId('preroll-video'), new Event('playing'));
    act(() => vi.advanceTimersByTime(5000));
    fireEvent(screen.getByTestId('preroll-video'), new Event('ended'));
    fireEvent.click(screen.getByRole('button', { name: /pular/i }));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('retries muted when unmuted autoplay is blocked, and does not finish', async () => {
    const play = vi.fn();
    play.mockReturnValueOnce(Promise.reject(new Error('NotAllowedError')));
    play.mockReturnValueOnce(Promise.resolve());
    HTMLMediaElement.prototype.play = play;

    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(play).toHaveBeenCalledTimes(2);
    const video = screen.getByTestId('preroll-video') as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('offers "Ativar som" after the muted fallback, and unmutes on click', async () => {
    const play = vi.fn();
    play.mockReturnValueOnce(Promise.reject(new Error('NotAllowedError')));
    play.mockReturnValueOnce(Promise.resolve());
    HTMLMediaElement.prototype.play = play;

    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const unmute = screen.getByRole('button', { name: /ativar som/i });
    fireEvent.click(unmute);

    const video = screen.getByTestId('preroll-video') as HTMLVideoElement;
    expect(video.muted).toBe(false);
    expect(screen.queryByRole('button', { name: /ativar som/i })).toBeNull();
  });

  it('does not offer "Ativar som" when unmuted autoplay succeeds', async () => {
    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole('button', { name: /ativar som/i })).toBeNull();
  });

  it('finishes when both the unmuted and muted autoplay attempts are blocked', async () => {
    const play = vi.fn().mockReturnValue(Promise.reject(new Error('NotAllowedError')));
    HTMLMediaElement.prototype.play = play;

    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(play).toHaveBeenCalledTimes(2);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('finishes via the watchdog when playing never fires', () => {
    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    act(() => vi.advanceTimersByTime(8000));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it('cancels the watchdog once playing fires, no premature finish', () => {
    render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    act(() => vi.advanceTimersByTime(3000));
    fireEvent(screen.getByTestId('preroll-video'), new Event('playing'));
    act(() => vi.advanceTimersByTime(8000));
    expect(onFinished).not.toHaveBeenCalled();
  });

  it('clears the skip-reveal timer on unmount so it never fires after unmount', () => {
    const { unmount } = render(<PreRollPlayer ad={videoAd} onFinished={onFinished} />);
    fireEvent(screen.getByTestId('preroll-video'), new Event('playing'));
    unmount();
    // No act-warning / crash expected — timer must be cleared, not fired
    // against an unmounted component.
    act(() => vi.advanceTimersByTime(5000));
    expect(onFinished).not.toHaveBeenCalled();
  });
});
