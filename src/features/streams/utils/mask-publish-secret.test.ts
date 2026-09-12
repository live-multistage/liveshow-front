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

  it('fails closed: masks everything after :publisher: when the marker is present but the shape does not match the regex', () => {
    // Not the recognized "streamid=publish:" prefix (e.g. a future/alternate
    // encoding), but the `:publisher:` marker is still there — the secret
    // MUST NOT leak just because the exact shape changed underneath us.
    const url = 'srt://h:8890?sid=publish:cam_1:publisher:abc123&mode=caller';
    expect(maskPublishSecret(url)).toBe('srt://h:8890?sid=publish:cam_1:publisher:••••••••');
  });
});
