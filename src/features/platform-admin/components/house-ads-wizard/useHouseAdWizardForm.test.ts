import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { HouseAdListItem } from '../../house-ads';
import { isoToLocal, localToIso } from './useHouseAdWizardForm';

const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const uploadBannerMutateAsync = vi.fn();
const uploadVideoMutateAsync = vi.fn();
const changeStatusMutateAsync = vi.fn();
const houseAdQueryMock = vi.fn();

vi.mock('../../house-ads', async () => {
  const actual = await vi.importActual<typeof import('../../house-ads')>('../../house-ads');
  return {
    ...actual,
    useCreateHouseAdMutation: () => ({ mutateAsync: createMutateAsync }),
    useUpdateHouseAdMutation: () => ({ mutateAsync: updateMutateAsync }),
    useUploadHouseAdBannerMutation: () => ({ mutateAsync: uploadBannerMutateAsync }),
    useUploadHouseAdVideoMutation: () => ({ mutateAsync: uploadVideoMutateAsync }),
    useChangeHouseAdStatusMutation: () => ({ mutateAsync: changeStatusMutateAsync }),
    useHouseAdQuery: (id: string | null) => houseAdQueryMock(id),
  };
});

// Real validateFileBasics/validateCreativeFile run (they're synchronous for
// non-WIDE_16_9 formats); only the media-decode probes jsdom can't do are
// stubbed, same as HouseAdWizardDialog.test.tsx.
vi.mock('./upload-limits', async () => {
  const actual = await vi.importActual<typeof import('./upload-limits')>('./upload-limits');
  return {
    ...actual,
    probeVideoDuration: vi.fn().mockResolvedValue(10),
    probeImageDimensions: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
  };
});

import { useHouseAdWizardForm } from './useHouseAdWizardForm';

const existingAd: HouseAdListItem = {
  id: 'ad-9',
  title: 'Festival Rota Sul',
  destination: { type: 'EVENT', eventId: 'evt-1' },
  format: 'HORIZONTAL_728x90',
  placements: ['FEED'],
  startsAt: '2026-10-01T00:00:00.000Z',
  endsAt: '2026-10-15T23:59:00.000Z',
  status: 'PAUSED',
  housePriority: 'FILL',
  impressions30d: 100,
  clicks30d: 5,
  ctr30d: 0.05,
};

beforeEach(() => {
  vi.clearAllMocks();
  houseAdQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  createMutateAsync.mockResolvedValue({ id: 'ad-1', status: 'DRAFT', housePriority: 'FILL' });
  updateMutateAsync.mockResolvedValue({ ok: true });
  uploadBannerMutateAsync.mockResolvedValue({ bannerUrl: 'https://cdn/banner.jpg' });
  uploadVideoMutateAsync.mockResolvedValue({ videoUrl: 'https://cdn/video.mp4', videoDurationSec: 10 });
  changeStatusMutateAsync.mockResolvedValue({ ok: true });
});

describe('isoToLocal / localToIso round trip', () => {
  it('recovers the exact local datetime-local string regardless of timezone', () => {
    const local = '2026-10-01T00:00';
    expect(isoToLocal(localToIso(local))).toBe(local);
  });

  it('does not shift a UTC instant by the host offset (the bug: iso.slice(0, 16) treated UTC digits as local)', () => {
    const iso = existingAd.startsAt; // '2026-10-01T00:00:00.000Z'
    // Round-tripping through the input and back must reproduce the same
    // instant, regardless of what the local wall-clock string looks like.
    expect(localToIso(isoToLocal(iso))).toBe(iso);
  });
});

describe('reopening the same ad (Editar -> Cancelar -> Editar)', () => {
  it('re-merges cached detail targeting on every reopen, not just the first', async () => {
    houseAdQueryMock.mockReturnValue({
      data: {
        id: 'ad-9',
        title: 'Festival Rota Sul',
        format: 'HORIZONTAL_728x90',
        placements: ['FEED'],
        destination: { type: 'EVENT', eventId: 'evt-1' },
        targetDomains: ['ENTERTAINMENT'],
        targetCategories: ['rock'],
        targetAgeBrackets: [],
        frequencyCapMax: 3,
        frequencyCapWindow: 'day',
        startsAt: existingAd.startsAt,
        endsAt: existingAd.endsAt,
        status: 'PAUSED',
        housePriority: 'FILL',
        bannerUrl: 'https://cdn/existing-banner.jpg',
        videoUrl: null,
        videoDurationSec: null,
      },
      isLoading: false,
      isError: false,
    });

    const { result, rerender } = renderHook(
      ({ open }) => useHouseAdWizardForm({ ad: existingAd, open, onSaved: vi.fn() }),
      { initialProps: { open: false } },
    );

    // First open: merges fine.
    rerender({ open: true });
    expect(result.current.draft.targetDomains).toEqual(['ENTERTAINMENT']);

    // Cancelar: dialog closes but stays mounted (React Query's cached
    // `data` object is referentially identical on the next open).
    rerender({ open: false });
    // Editar again for the SAME ad.
    rerender({ open: true });

    expect(result.current.draft.targetDomains).toEqual(['ENTERTAINMENT']);

    await act(async () => {
      await result.current.submit();
    });

    // Before the fix, targetingLoaded stayed false after the second open, so
    // the submit guard fired and updateAd was never called.
    expect(updateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ payload: expect.objectContaining({ targetDomains: ['ENTERTAINMENT'] }) }),
    );
  });
});

describe('retrying a failed create', () => {
  it('does not create a second ad when a retry follows a failed upload/publish', async () => {
    const { result } = renderHook(() => useHouseAdWizardForm({ ad: null, open: true, onSaved: vi.fn() }));

    const file = new File(['x'], 'banner.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });

    act(() => {
      result.current.update('title', 'Estreia');
      result.current.setFormat('HORIZONTAL_728x90');
      result.current.update('destinationEventId', 'evt-1');
      result.current.update('creativeFile', file);
      result.current.update('creativeFileName', file.name);
      result.current.togglePlacement('FEED');
      result.current.update('startsAt', '2026-10-01T00:00');
      result.current.update('endsAt', '2026-10-15T23:59');
    });

    uploadBannerMutateAsync.mockRejectedValueOnce(new Error('network down'));

    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.submitError).toBe('network down');
    expect(createMutateAsync).toHaveBeenCalledTimes(1);
    expect(changeStatusMutateAsync).not.toHaveBeenCalled();

    // Retry: the DRAFT already exists server-side.
    await act(async () => {
      await result.current.submit();
    });

    expect(createMutateAsync).toHaveBeenCalledTimes(1);
    expect(uploadBannerMutateAsync).toHaveBeenCalledTimes(2);
    expect(changeStatusMutateAsync).toHaveBeenCalledWith({ id: 'ad-1', action: 'publish' });
  });
});

describe('submit() re-validates the creative instead of trusting a stale/pending check', () => {
  it('blocks publishing when the draft carries a file that never actually passed validation', async () => {
    const { result } = renderHook(() => useHouseAdWizardForm({ ad: null, open: true, onSaved: vi.fn() }));

    const oversized = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversized, 'size', { value: 3 * 1024 * 1024 });

    act(() => {
      result.current.update('title', 'Estreia');
      result.current.setFormat('HORIZONTAL_728x90');
      result.current.update('destinationEventId', 'evt-1');
      // Set the file/filename directly, the way setCreativeFile does
      // synchronously, WITHOUT letting validateCreativeFile run — this is
      // exactly the state a fast click-through leaves behind: creativeError
      // still null even though the file is invalid.
      result.current.update('creativeFile', oversized);
      result.current.update('creativeFileName', oversized.name);
      result.current.togglePlacement('FEED');
      result.current.update('startsAt', '2026-10-01T00:00');
      result.current.update('endsAt', '2026-10-15T23:59');
    });

    // The stale/unvalidated state is enough to pass step 1's own check —
    // this is the bug: nothing blocks navigation to step 4 either.
    expect(result.current.canProceed).toBe(true);

    await act(async () => {
      await result.current.submit();
    });

    expect(createMutateAsync).not.toHaveBeenCalled();
    expect(result.current.submitError).toMatch(/o limite é 2 mb/i);
  });
});
