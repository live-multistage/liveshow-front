import { describe, it, expect, afterEach, vi } from 'vitest';
import { validateTeaserVideo } from './validate-teaser-video';

function stubVideoDuration(duration: number) {
  const originalCreateElement = document.createElement.bind(document);
  return vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag !== 'video') return originalCreateElement(tag);
    const el = originalCreateElement('video') as HTMLVideoElement;
    Object.defineProperty(el, 'duration', { value: duration, configurable: true });
    // jsdom never fires real media events, so trigger the callback once it's assigned.
    queueMicrotask(() => el.onloadedmetadata?.(new Event('loadedmetadata')));
    return el;
  });
}

describe('validateTeaserVideo', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects a non-mp4 file', async () => {
    const file = new File(['x'], 'teaser.mov', { type: 'video/quicktime' });
    expect(await validateTeaserVideo(file)).toBe('O vídeo precisa estar no formato MP4.');
  });

  it('rejects a file over 50MB', async () => {
    const file = new File([new Uint8Array(1)], 'teaser.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 + 1 });
    expect(await validateTeaserVideo(file)).toBe('O vídeo precisa ter no máximo 50MB.');
  });

  it('rejects a video longer than 30 seconds', async () => {
    stubVideoDuration(45);
    const file = new File(['x'], 'teaser.mp4', { type: 'video/mp4' });
    expect(await validateTeaserVideo(file)).toBe('O vídeo precisa ter no máximo 30 segundos.');
  });

  it('accepts a valid mp4 within limits', async () => {
    stubVideoDuration(12);
    const file = new File(['x'], 'teaser.mp4', { type: 'video/mp4' });
    expect(await validateTeaserVideo(file)).toBeNull();
  });
});
