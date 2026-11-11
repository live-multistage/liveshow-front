import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { httpClient } = vi.hoisted(() => ({
  httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

vi.mock('@/lib/http/client', () => ({ httpClient }));

import type { SaveDraftRequest } from '@live-show/api-contracts';
import { isDraftConflict, isFeaturedUnavailable, pagesService } from './pages.service';

const ok = <T>(data: T) => ({ data }) as AxiosResponse<T>;

describe('pagesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list forwards filters as query params', async () => {
    httpClient.get.mockResolvedValue(ok([]));

    await pagesService.list({ status: 'DRAFT', q: 'verão' });

    expect(httpClient.get).toHaveBeenCalledWith('/platform/pages', { params: { status: 'DRAFT', q: 'verão' } });
  });

  it('uploadAsset posts the file as multipart field "file"', async () => {
    httpClient.post.mockResolvedValue(ok({ url: 'https://cdn.showon.io/a.png' }));
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    await expect(pagesService.uploadAsset(file)).resolves.toEqual({ url: 'https://cdn.showon.io/a.png' });

    const [path, form, config] = httpClient.post.mock.calls[0];
    expect(path).toBe('/platform/pages/assets');
    expect((form as FormData).get('file')).toBe(file);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  it('saveDraft sends a PUT with the document and base revision', async () => {
    httpClient.put.mockResolvedValue(ok({ draftRevision: 4, draftUpdatedAt: '2026-11-05T00:00:00Z' }));
    const body: SaveDraftRequest = { document: { schemaVersion: 1, context: { type: 'none' }, sections: [] }, baseRevision: 3 };

    const result = await pagesService.saveDraft('page-1', body);

    expect(httpClient.put).toHaveBeenCalledWith('/platform/pages/page-1/draft', body);
    expect(result).toEqual({ draftRevision: 4, draftUpdatedAt: '2026-11-05T00:00:00Z' });
  });

  it('publish posts to the versions route', async () => {
    httpClient.post.mockResolvedValue(ok({ number: 2 }));

    await pagesService.publish('page-1', { changeSummary: 'Nova faixa', baseRevision: 4 });

    expect(httpClient.post).toHaveBeenCalledWith('/platform/pages/page-1/versions', {
      changeSummary: 'Nova faixa',
      baseRevision: 4,
    });
  });

  it('restoreVersion posts to the version number route', async () => {
    httpClient.post.mockResolvedValue(ok({}));

    await pagesService.restoreVersion('page-1', 3);

    expect(httpClient.post).toHaveBeenCalledWith('/platform/pages/page-1/versions/3/restore');
  });

  it('getVersion reads the version document route', async () => {
    httpClient.get.mockResolvedValue(ok({}));

    await pagesService.getVersion('page-1', 3);

    expect(httpClient.get).toHaveBeenCalledWith('/platform/pages/page-1/versions/3');
  });

  it('unpublish, archive and unarchive post to their lifecycle routes', async () => {
    httpClient.post.mockResolvedValue(ok({}));

    await pagesService.unpublish('page-1');
    await pagesService.archive('page-1');
    await pagesService.unarchive('page-1');

    expect(httpClient.post.mock.calls.map((call) => call[0])).toEqual([
      '/platform/pages/page-1/unpublish',
      '/platform/pages/page-1/archive',
      '/platform/pages/page-1/unarchive',
    ]);
  });

  it('preview and publishDiff read their routes', async () => {
    httpClient.get.mockResolvedValue(ok({}));

    await pagesService.preview('page-1');
    await pagesService.publishDiff('page-1');

    expect(httpClient.get.mock.calls.map((call) => call[0])).toEqual([
      '/platform/pages/page-1/preview',
      '/platform/pages/page-1/publish-diff',
    ]);
  });
});

describe('isDraftConflict', () => {
  const axiosError = (status: number, code?: string) =>
    new AxiosError('boom', 'ERR', undefined, undefined, {
      status,
      data: code ? { code } : {},
    } as AxiosResponse);

  it('is true for a 409 with DRAFT_CONFLICT', () => {
    expect(isDraftConflict(axiosError(409, 'DRAFT_CONFLICT'))).toBe(true);
  });

  it('is false for a 409 with another code', () => {
    expect(isDraftConflict(axiosError(409, 'SLUG_TAKEN'))).toBe(false);
  });

  it('is false for other statuses and non-axios errors', () => {
    expect(isDraftConflict(axiosError(500, 'DRAFT_CONFLICT'))).toBe(false);
    expect(isDraftConflict(new Error('x'))).toBe(false);
    expect(isDraftConflict(null)).toBe(false);
  });
});

describe('isFeaturedUnavailable', () => {
  const axiosError = (status: number, code?: string) =>
    new AxiosError('boom', 'ERR', undefined, undefined, { status, data: code ? { code } : {} } as AxiosResponse);

  it('is true only for a 400 with FEATURED_UNAVAILABLE', () => {
    expect(isFeaturedUnavailable(axiosError(400, 'FEATURED_UNAVAILABLE'))).toBe(true);
    expect(isFeaturedUnavailable(axiosError(400, 'INVALID_DOCUMENT'))).toBe(false);
    expect(isFeaturedUnavailable(axiosError(409, 'FEATURED_UNAVAILABLE'))).toBe(false);
    expect(isFeaturedUnavailable(new Error('x'))).toBe(false);
  });
});
