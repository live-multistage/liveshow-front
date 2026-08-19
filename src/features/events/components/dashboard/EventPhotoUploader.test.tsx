import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../mutations/upload-event-asset.mutation', () => ({
  useUploadAssetMutation: vi.fn(),
  useUploadGalleryPhotoMutation: vi.fn(),
}));
vi.mock('../../utils/validate-teaser-video', () => ({
  validateTeaserVideo: vi.fn(),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventPhotoUploader } from './EventPhotoUploader';
import { useUploadAssetMutation, useUploadGalleryPhotoMutation } from '../../mutations/upload-event-asset.mutation';
import { validateTeaserVideo } from '../../utils/validate-teaser-video';
import type { EventResponse } from '../../types/event.types';

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

function getTeaserInput() {
  return document.querySelector('input[accept="video/mp4"]') as HTMLInputElement;
}

describe('EventPhotoUploader — teaser video field', () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useUploadAssetMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ mutateAsync, isPending: false });
    (useUploadGalleryPhotoMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders the teaser video field', () => {
    render(<EventPhotoUploader event={makeEvent()} onDone={() => {}} />);
    expect(screen.getByText('Teaser')).toBeInTheDocument();
    expect(getTeaserInput()).toBeInTheDocument();
  });

  it('rejects an invalid file client-side and never calls the upload mutation', async () => {
    (validateTeaserVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('O vídeo precisa estar no formato MP4.');
    const user = userEvent.setup({ applyAccept: false });
    render(<EventPhotoUploader event={makeEvent()} onDone={() => {}} />);

    const file = new File(['x'], 'teaser.mov', { type: 'video/quicktime' });
    await user.upload(getTeaserInput(), file);

    await waitFor(() => expect(screen.getByText('O vídeo precisa estar no formato MP4.')).toBeInTheDocument());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('uploads a valid file and renders the video preview on success', async () => {
    (validateTeaserVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mutateAsync.mockResolvedValue(makeEvent({ teaserVideoUrl: 'https://cdn.example.com/teaser.mp4' }));
    const user = userEvent.setup();
    render(<EventPhotoUploader event={makeEvent()} onDone={() => {}} />);

    const file = new File(['x'], 'teaser.mp4', { type: 'video/mp4' });
    await user.upload(getTeaserInput(), file);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ assetType: 'teaserVideo', file }));

    const preview = await screen.findByTestId('teaser-video-preview');
    expect(preview).toHaveAttribute('src', 'https://cdn.example.com/teaser.mp4');
  });

  it('replaces an already-uploaded teaser video', async () => {
    (validateTeaserVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mutateAsync.mockResolvedValue(makeEvent({ teaserVideoUrl: 'https://cdn.example.com/new.mp4' }));
    const user = userEvent.setup();
    render(<EventPhotoUploader event={makeEvent({ teaserVideoUrl: 'https://cdn.example.com/old.mp4' })} onDone={() => {}} />);

    expect(await screen.findByTestId('teaser-video-preview')).toHaveAttribute('src', 'https://cdn.example.com/old.mp4');

    const file = new File(['x'], 'teaser2.mp4', { type: 'video/mp4' });
    await user.upload(getTeaserInput(), file);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ assetType: 'teaserVideo', file }));
    expect(await screen.findByTestId('teaser-video-preview')).toHaveAttribute('src', 'https://cdn.example.com/new.mp4');
  });
});
