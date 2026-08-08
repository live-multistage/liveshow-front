import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../mutations/upload-event-asset.mutation', () => ({
  useUploadAssetMutation: vi.fn(),
}));
vi.mock('../utils/validate-teaser-video', () => ({
  validateTeaserVideo: vi.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { useEventAssetUpload } from './use-event-asset-upload';
import { useUploadAssetMutation } from '../mutations/upload-event-asset.mutation';
import { validateTeaserVideo } from '../utils/validate-teaser-video';
import type { EventResponse } from '../types/event.types';

function makeEvent(overrides: Partial<EventResponse> = {}): EventResponse {
  return {
    id: 'evt-1',
    title: 'Show',
    description: 'desc',
    category: 'MUSIC',
    organizationId: 'org-1',
    organization: null,
    startsAt: '2026-01-01T00:00:00Z',
    endsAt: '2026-01-01T02:00:00Z',
    status: 'DRAFT',
    bannerUrl: null,
    thumbnailUrl: null,
    teaserVideoUrl: null,
    finishedAt: null,
    venue: null,
    city: null,
    country: null,
    venueData: null,
    visibility: 'PUBLIC',
    format: 'LIVE',
    latencyMode: 'STANDARD',
    domain: null,
    subtype: null,
    camerasCount: 0,
    isFree: true,
    publiclyFunded: false,
    ...overrides,
  };
}

describe('useEventAssetUpload', () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useUploadAssetMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ mutateAsync });
  });

  it('flips the teaser slot to uploading before the async validation settles', async () => {
    let resolveValidation: (v: string | null) => void = () => {};
    const pending = new Promise<string | null>((resolve) => {
      resolveValidation = resolve;
    });
    (validateTeaserVideo as unknown as ReturnType<typeof vi.fn>).mockReturnValue(pending);

    const { result } = renderHook(() => useEventAssetUpload(makeEvent()));
    const file = new File(['x'], 'teaser.mp4', { type: 'video/mp4' });

    act(() => {
      void result.current.handleAsset('teaserVideo', file);
    });

    // Validation hasn't resolved yet, but the UI must already show feedback.
    await waitFor(() => expect(result.current.teaser.uploading).toBe(true));

    resolveValidation(null);
    mutateAsync.mockResolvedValue(makeEvent({ teaserVideoUrl: 'https://cdn.example.com/t.mp4' }));

    await waitFor(() => expect(result.current.teaser.uploading).toBe(false));
    expect(result.current.teaser.url).toBe('https://cdn.example.com/t.mp4');
  });

  it('calls onUploaded with the updated event after a successful upload', async () => {
    (validateTeaserVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const updated = makeEvent({ teaserVideoUrl: 'https://cdn.example.com/t.mp4' });
    mutateAsync.mockResolvedValue(updated);
    const onUploaded = vi.fn();

    const { result } = renderHook(() => useEventAssetUpload(makeEvent(), onUploaded));
    const file = new File(['x'], 'teaser.mp4', { type: 'video/mp4' });

    await act(async () => {
      await result.current.handleAsset('teaserVideo', file);
    });

    expect(onUploaded).toHaveBeenCalledWith(updated);
  });
});
