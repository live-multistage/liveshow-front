import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportModal } from './ReportModal';
import { reportsService } from '../api/reports.service';

vi.mock('../api/reports.service', () => ({
  reportsService: { submit: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// jsdom doesn't implement these — Radix Select needs them to open/select.
beforeEach(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const mockedService = vi.mocked(reportsService);

function renderModal(getReporterKey: () => string | undefined = () => undefined) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <ReportModal open onOpenChange={onOpenChange} eventId="evt-1" getReporterKey={getReporterKey} />
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

async function selectReason(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('combobox'));
  await user.click(await screen.findByRole('option', { name: label }));
}

describe('ReportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits with the selected reason and detail', async () => {
    mockedService.submit.mockResolvedValue({ id: 'report-1' });
    const user = userEvent.setup();
    renderModal(() => undefined);

    await selectReason(user, 'reasons.VIOLENCE');
    await user.type(screen.getByPlaceholderText('detailPlaceholder'), 'They hit someone on stream');
    await user.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mockedService.submit).toHaveBeenCalledWith({
        targetType: 'EVENT',
        targetId: 'evt-1',
        reason: 'VIOLENCE',
        detail: 'They hit someone on stream',
        reporterKey: undefined,
      });
    });
  });

  it('shows a friendly message on 409 (already reported)', async () => {
    mockedService.submit.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: 'Conflict' } },
    });
    const user = userEvent.setup();
    renderModal();

    await selectReason(user, 'reasons.SPAM_MISLEADING');
    await user.click(screen.getByRole('button', { name: 'submit' }));

    expect(await screen.findByText('alreadyReported')).toBeInTheDocument();
  });

  it('sends the anonymous reporterKey returned by getReporterKey', async () => {
    mockedService.submit.mockResolvedValue({ id: 'report-2' });
    const user = userEvent.setup();
    renderModal(() => 'anon-key-123');

    await selectReason(user, 'reasons.OTHER');
    await user.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(mockedService.submit).toHaveBeenCalledWith(
        expect.objectContaining({ reporterKey: 'anon-key-123' }),
      );
    });
  });
});
