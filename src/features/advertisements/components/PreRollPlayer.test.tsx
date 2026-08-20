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
});
