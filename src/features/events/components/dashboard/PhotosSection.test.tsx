import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../mutations/upload-event-asset.mutation', () => ({
  useUploadAssetMutation: vi.fn(),
  useUploadGalleryPhotoMutation: vi.fn(),
}));
vi.mock('../../queries/get-event', () => ({
  useListEventPhotosQuery: vi.fn(),
  eventKeys: {
    detail: (id: string) => ['events', 'detail', id],
    photos: (id: string) => ['events', 'photos', id],
  },
}));
vi.mock('../../utils/validate-teaser-video', () => ({
  validateTeaserVideo: vi.fn(),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PhotosSection } from './PhotosSection';
import { useUploadAssetMutation, useUploadGalleryPhotoMutation } from '../../mutations/upload-event-asset.mutation';
import { useListEventPhotosQuery } from '../../queries/get-event';
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

function renderWithClient(event: EventResponse) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PhotosSection event={event} />
    </QueryClientProvider>,
  );
}

function getTeaserInput() {
  return document.querySelector('input[accept="video/mp4"]') as HTMLInputElement;
}

describe('PhotosSection — teaser video field', () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useUploadAssetMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ mutateAsync, isPending: false });
    (useUploadGalleryPhotoMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    (useListEventPhotosQuery as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
  });

  it('renders the teaser video field', () => {
    renderWithClient(makeEvent());
    expect(screen.getByText('Teaser')).toBeInTheDocument();
    expect(getTeaserInput()).toBeInTheDocument();
  });

  it('rejects an invalid file client-side and never calls the upload mutation', async () => {
    (validateTeaserVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('O vídeo precisa estar no formato MP4.');
    // A real file picker constrained by accept="video/mp4" would never hand us a
    // .mov — but users can rename extensions, so disable user-event's own accept
    // filtering to exercise the app's client-side validation as the last line of defense.
    const user = userEvent.setup({ applyAccept: false });
    renderWithClient(makeEvent());

    const file = new File(['x'], 'teaser.mov', { type: 'video/quicktime' });
    await user.upload(getTeaserInput(), file);

    await waitFor(() => expect(screen.getByText('O vídeo precisa estar no formato MP4.')).toBeInTheDocument());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('uploads a valid file and renders the video preview on success', async () => {
    (validateTeaserVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    mutateAsync.mockResolvedValue(makeEvent({ teaserVideoUrl: 'https://cdn.example.com/teaser.mp4' }));
    const user = userEvent.setup();
    renderWithClient(makeEvent());

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
    renderWithClient(makeEvent({ teaserVideoUrl: 'https://cdn.example.com/old.mp4' }));

    expect(await screen.findByTestId('teaser-video-preview')).toHaveAttribute('src', 'https://cdn.example.com/old.mp4');

    const file = new File(['x'], 'teaser2.mp4', { type: 'video/mp4' });
    await user.upload(getTeaserInput(), file);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ assetType: 'teaserVideo', file }));
    expect(await screen.findByTestId('teaser-video-preview')).toHaveAttribute('src', 'https://cdn.example.com/new.mp4');
  });
});
