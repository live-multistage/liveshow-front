import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { HouseAdDetail, HouseAdListItem } from '../../house-ads';

const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();
const uploadBannerMutateAsync = vi.fn();
const uploadVideoMutateAsync = vi.fn();
const changeStatusMutateAsync = vi.fn();
const houseAdQueryMock = vi.fn();
const callOrder: string[] = [];

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

// jsdom has no real media decoder: probing a video/image's real dimensions
// would hang forever waiting for events jsdom never fires. Those probes are
// covered on their own in upload-limits.test.ts; here they just need to
// resolve so the wizard's type/size checks (the part under test) can run.
vi.mock('./upload-limits', async () => {
  const actual = await vi.importActual<typeof import('./upload-limits')>('./upload-limits');
  return {
    ...actual,
    probeVideoDuration: vi.fn().mockResolvedValue(10),
    probeImageDimensions: vi.fn().mockResolvedValue({ width: 1920, height: 1080 }),
  };
});

vi.mock('../../services/platform-admin.service', () => ({
  platformAdminService: {
    getPlatformEvents: vi.fn().mockResolvedValue({
      items: [{ id: 'evt-1', title: 'Showon Sessions — Ep. 1', orgName: 'Canal Showon' }],
      total: 1,
    }),
  },
}));

import { HouseAdWizardDialog } from './HouseAdWizardDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof HouseAdWizardDialog>> = {}) {
  const queryClient = new QueryClient();
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <HouseAdWizardDialog open onOpenChange={onOpenChange} onSaved={onSaved} {...props} />
    </QueryClientProvider>,
  );
  return { ...utils, onOpenChange, onSaved };
}

function continueButton() {
  return screen.getByRole('button', { name: /continuar/i });
}

async function fillStep1({ withVideo = false }: { withVideo?: boolean } = {}) {
  fireEvent.change(screen.getByLabelText('Título do anúncio'), { target: { value: 'Estreia: Showon Sessions' } });
  fireEvent.click(screen.getByRole('radio', { name: withVideo ? /vídeo 16:9/i : /banner 728×90/i }));

  const file = withVideo
    ? new File(['x'], 'teaser.mp4', { type: 'video/mp4' })
    : new File(['x'], 'banner.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  Object.defineProperty(file, 'size', { value: 1024 });
  fireEvent.change(screen.getByLabelText('Selecionar arquivo do criativo'), { target: { files: [file] } });
  await waitFor(() => expect(screen.queryByText(/não foi possível ler/i)).not.toBeInTheDocument());

  fireEvent.click(screen.getByRole('tab', { name: /evento da plataforma/i }));
  fireEvent.change(screen.getByLabelText('Buscar evento pelo título'), { target: { value: 'Showon' } });
  await waitFor(() => screen.getByText('Showon Sessions — Ep. 1'));
  fireEvent.click(screen.getByText('Showon Sessions — Ep. 1'));
}

function fillStep2() {
  fireEvent.click(screen.getByRole('checkbox', { name: /feed/i }));
}

function fillStep3() {
  fireEvent.change(document.getElementById('house-ad-starts-at') as HTMLInputElement, {
    target: { value: '2026-10-01T00:00' },
  });
  fireEvent.change(document.getElementById('house-ad-ends-at') as HTMLInputElement, {
    target: { value: '2026-10-15T23:59' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  callOrder.length = 0;
  // Default: no ad selected (create mode) or, in edit-mode tests that don't
  // override this, a detail fetch that "hasn't arrived yet" — each edit test
  // sets its own resolved/loading/error shape explicitly.
  houseAdQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: false });
  createMutateAsync.mockImplementation(async (payload) => {
    callOrder.push('create');
    return { id: 'ad-1', status: 'DRAFT', housePriority: payload.housePriority };
  });
  updateMutateAsync.mockImplementation(async () => {
    callOrder.push('update');
    return { ok: true };
  });
  uploadBannerMutateAsync.mockImplementation(async () => {
    callOrder.push('uploadBanner');
    return { bannerUrl: 'https://cdn/banner.jpg' };
  });
  uploadVideoMutateAsync.mockImplementation(async () => {
    callOrder.push('uploadVideo');
    return { videoUrl: 'https://cdn/video.mp4', videoDurationSec: 10 };
  });
  changeStatusMutateAsync.mockImplementation(async () => {
    callOrder.push('publish');
    return { ok: true };
  });
});

describe('HouseAdWizardDialog — step validation', () => {
  it('blocks step 1 until title, format, creative and destination are filled', async () => {
    renderDialog();
    expect(continueButton()).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Título do anúncio'), { target: { value: 'Estreia' } });
    expect(continueButton()).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /banner 728×90/i }));
    expect(continueButton()).toBeDisabled(); // still no creative/destination

    await fillStep1();
    expect(continueButton()).not.toBeDisabled();
  });

  it('blocks step 2 until at least one placement is selected', async () => {
    renderDialog();
    await fillStep1();
    fireEvent.click(continueButton());

    expect(screen.getByText(/selecione ao menos uma posição/i)).toBeInTheDocument();
    expect(continueButton()).toBeDisabled();

    fillStep2();
    expect(continueButton()).not.toBeDisabled();
  });

  it('blocks step 3 until end is after start', async () => {
    renderDialog();
    await fillStep1();
    fireEvent.click(continueButton());
    fillStep2();
    fireEvent.click(continueButton());

    expect(continueButton()).toBeDisabled();

    fireEvent.change(document.getElementById('house-ad-starts-at') as HTMLInputElement, {
      target: { value: '2026-10-15T00:00' },
    });
    fireEvent.change(document.getElementById('house-ad-ends-at') as HTMLInputElement, {
      target: { value: '2026-10-01T00:00' },
    });
    expect(continueButton()).toBeDisabled();

    fillStep3();
    expect(continueButton()).not.toBeDisabled();
  });
});

describe('HouseAdWizardDialog — format/placement compatibility', () => {
  it('drops a placement that becomes incompatible after switching format', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('radio', { name: /banner 728×90/i }));
    await fillStep1();
    fireEvent.click(continueButton());

    fireEvent.click(screen.getByRole('checkbox', { name: /feed/i }));
    expect(screen.getByRole('checkbox', { name: /pre-roll/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /voltar/i }));
    fireEvent.click(screen.getByRole('radio', { name: /vídeo 16:9/i }));
    // Re-upload a valid video since the banner file no longer matches the format.
    const video = new File(['x'], 'teaser.mp4', { type: 'video/mp4' });
    Object.defineProperty(video, 'size', { value: 1024 });
    fireEvent.change(screen.getByLabelText('Selecionar arquivo do criativo'), { target: { files: [video] } });
    await waitFor(() => expect(continueButton()).not.toBeDisabled());
    fireEvent.click(continueButton());

    // FEED is only compatible with page formats, so switching to VIDEO_16_9 must drop it.
    expect(screen.getByRole('checkbox', { name: /feed/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /pre-roll/i })).not.toBeDisabled();
  });
});

describe('HouseAdWizardDialog — upload limits', () => {
  it('rejects an oversized image without calling the API', async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('Título do anúncio'), { target: { value: 'Estreia' } });
    fireEvent.click(screen.getByRole('radio', { name: /banner 728×90/i }));

    const oversized = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversized, 'size', { value: 3 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText('Selecionar arquivo do criativo'), { target: { files: [oversized] } });

    await waitFor(() => expect(screen.getByText(/o limite é 2 mb/i)).toBeInTheDocument());
    expect(continueButton()).toBeDisabled();
    expect(createMutateAsync).not.toHaveBeenCalled();
    expect(uploadBannerMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a non-mp4 file for the video format without calling the API', async () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('Título do anúncio'), { target: { value: 'Estreia' } });
    fireEvent.click(screen.getByRole('radio', { name: /vídeo 16:9/i }));

    const wrongType = new File(['x'], 'clip.mov', { type: 'video/quicktime' });
    Object.defineProperty(wrongType, 'size', { value: 1024 });
    fireEvent.change(screen.getByLabelText('Selecionar arquivo do criativo'), { target: { files: [wrongType] } });

    await waitFor(() => expect(screen.getByText(/envie um vídeo mp4/i)).toBeInTheDocument());
    expect(continueButton()).toBeDisabled();
    expect(uploadVideoMutateAsync).not.toHaveBeenCalled();
  });
});

describe('HouseAdWizardDialog — submit', () => {
  it('sends the exact create payload, uploads the creative, then publishes — in that order', async () => {
    renderDialog();
    await fillStep1();
    fireEvent.click(continueButton());
    fillStep2();
    fireEvent.click(continueButton());
    fillStep3();
    fireEvent.click(continueButton());

    fireEvent.click(screen.getByRole('button', { name: /^publicar$/i }));

    await waitFor(() => expect(changeStatusMutateAsync).toHaveBeenCalled());

    expect(createMutateAsync).toHaveBeenCalledWith({
      title: 'Estreia: Showon Sessions',
      format: 'HORIZONTAL_728x90',
      destination: { type: 'EVENT', eventId: 'evt-1' },
      placements: ['FEED'],
      targetDomains: [],
      targetCategories: [],
      housePriority: 'FILL',
      startsAt: new Date('2026-10-01T00:00').toISOString(),
      endsAt: new Date('2026-10-15T23:59').toISOString(),
    });
    expect(uploadBannerMutateAsync).toHaveBeenCalledWith({ id: 'ad-1', file: expect.any(File) });
    expect(changeStatusMutateAsync).toHaveBeenCalledWith({ id: 'ad-1', action: 'publish' });
    expect(callOrder).toEqual(['create', 'uploadBanner', 'publish']);
  });
});

describe('HouseAdWizardDialog — edit mode', () => {
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

  // What GET /house-ads/:id returns — the targeting, frequency cap and
  // creative the list row above never carries.
  const existingAdDetail: HouseAdDetail = {
    id: 'ad-9',
    title: 'Festival Rota Sul',
    format: 'HORIZONTAL_728x90',
    placements: ['FEED'],
    destination: { type: 'EVENT', eventId: 'evt-1' },
    targetDomains: ['MUSIC'],
    targetCategories: ['rock'],
    targetAgeBrackets: [],
    frequencyCapMax: 3,
    frequencyCapWindow: 'day',
    startsAt: '2026-10-01T00:00:00.000Z',
    endsAt: '2026-10-15T23:59:00.000Z',
    status: 'PAUSED',
    housePriority: 'FILL',
    bannerUrl: 'https://cdn/existing-banner.jpg',
    videoUrl: null,
    videoDurationSec: null,
  };

  function mockDetailResolved(id: string, detail: HouseAdDetail) {
    houseAdQueryMock.mockImplementation((queriedId: string | null) =>
      queriedId === id
        ? { data: detail, isLoading: false, isError: false }
        : { data: undefined, isLoading: false, isError: false },
    );
  }

  it('prefills from the ad and patches on save without publishing', async () => {
    mockDetailResolved('ad-9', existingAdDetail);
    renderDialog({ ad: existingAd });

    expect(screen.getByLabelText('Título do anúncio')).toHaveValue('Festival Rota Sul');
    expect(screen.getByRole('radio', { name: /banner 728×90/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/valem para as próximas exibições/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Título do anúncio'), { target: { value: 'Festival Rota Sul — remarcado' } });
    fireEvent.click(continueButton());
    fireEvent.click(continueButton());
    fireEvent.click(continueButton());

    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: 'ad-9',
      payload: expect.objectContaining({ title: 'Festival Rota Sul — remarcado' }),
    });
    expect(changeStatusMutateAsync).not.toHaveBeenCalled();
  });

  it('changing only the title patches without clearing targeting (exact payload)', async () => {
    mockDetailResolved('ad-9', existingAdDetail);
    renderDialog({ ad: existingAd });

    // The detail fetch is async — wait for its prefill (visible on step 1 as
    // the existing-creative link) before touching the form.
    await screen.findByRole('link', { name: /criativo atual/i });

    fireEvent.change(screen.getByLabelText('Título do anúncio'), { target: { value: 'Festival Rota Sul — remarcado' } });
    fireEvent.click(continueButton());
    fireEvent.click(continueButton());
    fireEvent.click(continueButton());
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith({
      id: 'ad-9',
      payload: {
        title: 'Festival Rota Sul — remarcado',
        format: 'HORIZONTAL_728x90',
        destination: { type: 'EVENT', eventId: 'evt-1' },
        placements: ['FEED'],
        targetDomains: ['MUSIC'],
        targetCategories: ['rock'],
        frequencyCapMax: 3,
        frequencyCapWindow: 'day',
        housePriority: 'FILL',
        startsAt: new Date(existingAd.startsAt.slice(0, 16)).toISOString(),
        endsAt: new Date(existingAd.endsAt.slice(0, 16)).toISOString(),
      },
    });
  });

  it('prefills targeting, frequency cap and the creative preview from the detail response', async () => {
    mockDetailResolved('ad-9', existingAdDetail);
    renderDialog({ ad: existingAd });

    expect(await screen.findByRole('link', { name: /criativo atual/i })).toHaveAttribute(
      'href',
      'https://cdn/existing-banner.jpg',
    );

    fireEvent.click(continueButton());

    expect(screen.getByText('MUSIC ×')).toBeInTheDocument();
    expect(screen.getByText('rock ×')).toBeInTheDocument();
    expect(screen.getByLabelText('Máximo de exibições por pessoa')).toHaveValue(3);
  });

  it('shows an error and blocks saving when the detail fetch fails', async () => {
    houseAdQueryMock.mockImplementation((id: string | null) =>
      id === 'ad-9' ? { data: undefined, isLoading: false, isError: true } : { data: undefined, isLoading: false, isError: false },
    );
    renderDialog({ ad: existingAd });

    expect(await screen.findByText(/não foi possível carregar os dados do anúncio/i)).toBeInTheDocument();
    expect(continueButton()).toBeDisabled();
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });
});
