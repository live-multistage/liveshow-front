import { describe, expect, it } from 'vitest';
import { longGopLiveSync } from './long-gop-latency';

describe('longGopLiveSync', () => {
  it('leaves a 2 s GOP to the default tuning', () => {
    expect(longGopLiveSync(Array(30).fill(2), 2)).toBeNull();
  });

  it('leaves occasional long segments alone: measured, a bigger margin only adds latency', () => {
    const lab = [...Array(15).fill(2), 11, ...Array(15).fill(2), 4];
    expect(longGopLiveSync(lab, 2)).toBeNull();
    expect(longGopLiveSync([2, 2, 3, 11, 2, 4, 8, 2, 11, 3, 5, 2], 2)).toBeNull();
  });

  it('holds a constant long GOP 1.5 segments back from the edge', () => {
    expect(longGopLiveSync(Array(10).fill(11), 2)).toBe(16.5);
    expect(longGopLiveSync([11, 11, 10.9, 11, 2], 2)).toBe(16.5);
  });

  it('needs a playlist to judge', () => {
    expect(longGopLiveSync([], 2)).toBeNull();
  });
});
