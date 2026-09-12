import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/http/client', () => ({
  httpClient: { post: vi.fn().mockResolvedValue({ data: { assetKey: 'mailing/abc.png', url: 'https://cdn/abc.png' } }) },
}));

import { httpClient } from '@/lib/http/client';
import { mailingService } from './mailing.service';

describe('mailingService.uploadAsset', () => {
  it('sends the file as FormData under the "file" field', async () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    await mailingService.uploadAsset(file);

    expect(httpClient.post).toHaveBeenCalledTimes(1);
    const [url, body] = vi.mocked(httpClient.post).mock.calls[0];
    expect(url).toBe('/mailing/assets');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBe(file);
  });
});
