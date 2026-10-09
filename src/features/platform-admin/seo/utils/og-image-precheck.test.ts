import { describe, expect, it } from 'vitest';
import { OG_IMAGE_MAX_BYTES, precheckOgImage } from './og-image-precheck';

const file = (type: string, size: number) => {
  const f = new File(['x'], 'a', { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('precheckOgImage', () => {
  it('rejects unsupported types', () => expect(precheckOgImage(file('image/avif', 10))).toBe('type'));
  it('rejects oversize', () => expect(precheckOgImage(file('image/png', OG_IMAGE_MAX_BYTES + 1))).toBe('size'));
  it('accepts gif', () => expect(precheckOgImage(file('image/gif', 10))).toBeNull());
  it('accepts valid files at the limit', () => expect(precheckOgImage(file('image/webp', OG_IMAGE_MAX_BYTES))).toBeNull());
});
