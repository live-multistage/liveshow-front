import { describe, expect, it, vi } from 'vitest';
import { validateFileBasics, validateCreativeFile } from './upload-limits';

function fileWithSize(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateFileBasics', () => {
  it('rejects an image over 2 MB', () => {
    const file = fileWithSize('big.jpg', 'image/jpeg', 3 * 1024 * 1024);
    expect(validateFileBasics(file, 'HORIZONTAL_728x90')).toMatch(/2 mb/i);
  });

  it('rejects a wrong image mime type', () => {
    const file = fileWithSize('x.gif', 'image/gif', 1024);
    expect(validateFileBasics(file, 'VERTICAL_300x600')).toMatch(/png, jpg ou webp/i);
  });

  it('accepts a valid image under the limit', () => {
    const file = fileWithSize('x.webp', 'image/webp', 1024);
    expect(validateFileBasics(file, 'WIDE_16_9')).toBeNull();
  });

  it('rejects a video over 50 MB', () => {
    const file = fileWithSize('x.mp4', 'video/mp4', 51 * 1024 * 1024);
    expect(validateFileBasics(file, 'VIDEO_16_9')).toMatch(/50 mb/i);
  });

  it('rejects a non-mp4 video', () => {
    const file = fileWithSize('x.mov', 'video/quicktime', 1024);
    expect(validateFileBasics(file, 'VIDEO_16_9')).toMatch(/mp4/i);
  });
});

describe('validateCreativeFile', () => {
  it('rejects an oversized image before probing dimensions', async () => {
    const file = fileWithSize('big.jpg', 'image/jpeg', 3 * 1024 * 1024);
    const error = await validateCreativeFile(file, 'WIDE_16_9');
    expect(error).toMatch(/2 mb/i);
  });

  it('rejects a video whose duration probe reports over 30s', async () => {
    const file = fileWithSize('x.mp4', 'video/mp4', 1024);
    vi.spyOn(HTMLMediaElement.prototype, 'duration', 'get').mockReturnValue(42);
    // jsdom never fires loadedmetadata on its own; the probe module drives
    // it purely off the video element's events, so this test only needs the
    // metadata event to fire — the duration getter above supplies the value.
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'video') {
        queueMicrotask(() => el.dispatchEvent(new Event('loadedmetadata')));
      }
      return el;
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const error = await validateCreativeFile(file, 'VIDEO_16_9');
    expect(error).toMatch(/30 s/i);

    vi.restoreAllMocks();
  });
});
