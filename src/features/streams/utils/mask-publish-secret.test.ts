import { describe, it, expect } from 'vitest';
import { maskPublishSecret } from './mask-publish-secret';

describe('maskPublishSecret', () => {
  it('masks the publish secret inside an R1-format SRT ingest URL', () => {
    const url = 'srt://h:8890?streamid=publish:cam_1:publisher:abc123&latency=200&mode=caller';
    expect(maskPublishSecret(url)).toBe(
      'srt://h:8890?streamid=publish:cam_1:publisher:••••••••&latency=200&mode=caller',
    );
  });

  it('leaves an old-format URL (no :publisher:) unchanged', () => {
    const url = 'srt://h:8890?streamid=publish:cam_64622481ca6c26e008832c8440353aeb&latency=200&mode=caller';
    expect(maskPublishSecret(url)).toBe(url);
  });
});
