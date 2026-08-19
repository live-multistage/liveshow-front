import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

let mockIsLoggedIn = false;
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => ({ isLoggedIn: mockIsLoggedIn }),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportButton } from './ReportButton';
import { reportsService } from '../api/reports.service';

vi.mock('../api/reports.service', () => ({
  reportsService: { submit: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  window.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

const mockedService = vi.mocked(reportsService);

function renderButton() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReportButton eventId="evt-1" />
    </QueryClientProvider>,
  );
}

async function submitOnce(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'trigger' }));
  await user.click(screen.getByRole('combobox'));
  await user.click(await screen.findByRole('option', { name: 'reasons.OTHER' }));
  await user.click(screen.getByRole('button', { name: 'submit' }));
}

describe('ReportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsLoggedIn = false;
    mockedService.submit.mockResolvedValue({ id: 'report-1' });
  });

  it('opens the report modal on click', async () => {
    const user = userEvent.setup();
    renderButton();

    expect(screen.queryByText('title')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'trigger' }));

    expect(await screen.findByText('title')).toBeInTheDocument();
  });

  it('generates and persists an anonymous reporterKey in localStorage, reused on the next open', async () => {
    const user = userEvent.setup();
    renderButton();

    await submitOnce(user);
    await waitFor(() => expect(mockedService.submit).toHaveBeenCalledTimes(1));

    const persistedKey = localStorage.getItem('report:key');
    expect(persistedKey).toBeTruthy();
    expect(mockedService.submit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ reporterKey: persistedKey }),
    );

    // Modal closes and resets on success — reopen and submit again.
    await submitOnce(user);
    await waitFor(() => expect(mockedService.submit).toHaveBeenCalledTimes(2));

    expect(localStorage.getItem('report:key')).toBe(persistedKey);
    expect(mockedService.submit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ reporterKey: persistedKey }),
    );
  });

  it('does not send a reporterKey when logged in', async () => {
    mockIsLoggedIn = true;
    const user = userEvent.setup();
    renderButton();

    await submitOnce(user);

    await waitFor(() => expect(mockedService.submit).toHaveBeenCalledTimes(1));
    expect(mockedService.submit).toHaveBeenCalledWith(
      expect.objectContaining({ reporterKey: undefined }),
    );
    expect(localStorage.getItem('report:key')).toBeNull();
  });
});
