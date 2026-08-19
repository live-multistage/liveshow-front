import { describe, it, expect, vi } from 'vitest';
import { playBestEffort } from './VideoPanel';

// Fake video whose play() resolves/rejects on demand. `muted` is a plain field,
// exactly as the fallback path reads/writes it.
function fakeVideo(playImpl: () => Promise<void>, muted = false) {
  return { muted, play: vi.fn(playImpl) } as unknown as HTMLVideoElement & { play: ReturnType<typeof vi.fn> };
}

describe('playBestEffort', () => {
  it('leaves sound on when unmuted autoplay is allowed', async () => {
    const video = fakeVideo(() => Promise.resolve(), false);
    const onBlocked = vi.fn();
    playBestEffort(video, onBlocked);
    await Promise.resolve();
    expect(video.muted).toBe(false);
    expect(onBlocked).not.toHaveBeenCalled();
  });

  it('falls back to muted and notifies when autoplay-with-sound is blocked', async () => {
    let first = true;
    const video = fakeVideo(() => {
      if (first) { first = false; return Promise.reject(new Error('NotAllowedError')); }
      return Promise.resolve();
    }, false);
    const onBlocked = vi.fn();
    playBestEffort(video, onBlocked);
    await Promise.resolve(); await Promise.resolve();
    expect(video.muted).toBe(true);
    expect(onBlocked).toHaveBeenCalledTimes(1);
    expect(video.play).toHaveBeenCalledTimes(2); // unmuted attempt + muted retry
  });

  it('does not attempt an unmuted retry for an already-muted tile', async () => {
    const video = fakeVideo(() => Promise.reject(new Error('fail')), true);
    const onBlocked = vi.fn();
    playBestEffort(video, onBlocked);
    await Promise.resolve();
    expect(onBlocked).not.toHaveBeenCalled();
    expect(video.play).toHaveBeenCalledTimes(1);
  });
});
