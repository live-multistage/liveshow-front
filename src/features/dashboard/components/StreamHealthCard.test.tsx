import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreamHealthCard } from './StreamHealthCard';
import { useStreamHealthQuery } from '@/features/platform-admin/queries/get-ops';
import type { StreamHealth } from '@/features/platform-admin/types/platform-admin.types';

vi.mock('@/features/platform-admin/queries/get-ops', () => ({
  useStreamHealthQuery: vi.fn(),
}));

const mockedQuery = vi.mocked(useStreamHealthQuery);

const health: StreamHealth = {
  liveEvents: 1,
  transcodeActive: 1,
  transcodeFailed: 2,
  ingestConnected: 1,
  activeJobs: [{
    id: 'job-1', cameraName: 'Cam A', eventTitle: 'Show X', status: 'RUNNING',
    error: null, startedAt: new Date(Date.now() - 90 * 60_000).toISOString(),
    endedAt: null, renditions: 3,
  }],
  failedJobs: [
    {
      id: 'job-2', cameraName: 'Cam B', eventTitle: 'Show X', status: 'RETRYING',
      error: 'ffmpeg exited with code 1', startedAt: null,
      endedAt: new Date(Date.now() - 10 * 60_000).toISOString(), renditions: 2,
    },
    {
      id: 'job-3', cameraName: 'Cam C', eventTitle: 'Show Y', status: 'FAILED',
      error: 'SRT source timeout', startedAt: null,
      endedAt: new Date(Date.now() - 60 * 60_000).toISOString(), renditions: 2,
    },
  ],
  ingestSessions: [{
    id: 'sess-1', cameraName: 'Cam A', eventTitle: 'Show X',
    remoteAddr: '203.0.113.7', startedAt: new Date(Date.now() - 90 * 60_000).toISOString(),
  }],
};

function renderCard(data: StreamHealth | undefined = health) {
  mockedQuery.mockReturnValue({ data } as ReturnType<typeof useStreamHealthQuery>);
  return render(<StreamHealthCard />);
}

beforeEach(() => vi.clearAllMocks());

describe('StreamHealthCard', () => {
  it('expands the failures list on click and shows error messages', async () => {
    renderCard();

    await userEvent.click(screen.getByRole('button', { name: /JOBS COM FALHA/i }));

    expect(screen.getByText('ffmpeg exited with code 1')).toBeInTheDocument();
    expect(screen.getByText('SRT source timeout')).toBeInTheDocument();
    expect(screen.getByText('RETRYING')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('keeps only one panel open at a time', async () => {
    renderCard();

    await userEvent.click(screen.getByRole('button', { name: /JOBS COM FALHA/i }));
    await userEvent.click(screen.getByRole('button', { name: /SESSÕES INGEST/i }));

    expect(screen.queryByText('ffmpeg exited with code 1')).not.toBeInTheDocument();
    expect(screen.getByText('203.0.113.7')).toBeInTheDocument();
  });

  it('collapses an open panel when its card is clicked again', async () => {
    renderCard();

    const btn = screen.getByRole('button', { name: /SESSÕES INGEST/i });
    await userEvent.click(btn);
    await userEvent.click(btn);

    expect(screen.queryByText('203.0.113.7')).not.toBeInTheDocument();
  });

  it('renders zero-value cards as inert (not buttons)', () => {
    renderCard({ ...health, transcodeActive: 0, activeJobs: [] });

    expect(screen.queryByRole('button', { name: /TRANSCODE JOBS/i })).not.toBeInTheDocument();
  });

  it('shows a fallback when the counter is > 0 but the list is empty (cache skew)', async () => {
    renderCard({ ...health, failedJobs: [] });

    await userEvent.click(screen.getByRole('button', { name: /JOBS COM FALHA/i }));

    expect(screen.getByText('Sem detalhes disponíveis.')).toBeInTheDocument();
  });

  it('does not crash on a pre-upgrade payload without detail arrays', async () => {
    renderCard({
      liveEvents: 1,
      transcodeActive: 1,
      transcodeFailed: 2,
      ingestConnected: 1,
    } as StreamHealth);

    await userEvent.click(screen.getByRole('button', { name: /JOBS COM FALHA/i }));

    expect(screen.getByText('Sem detalhes disponíveis.')).toBeInTheDocument();
  });
});
