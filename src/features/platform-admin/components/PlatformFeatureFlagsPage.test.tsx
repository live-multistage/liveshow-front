import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, string>) =>
      values ? `${key}:${JSON.stringify(values)}` : key;
    t.has = () => true;
    return t;
  },
}));
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlatformFeatureFlagsPage } from './PlatformFeatureFlagsPage';
import { platformAdminService } from '../services/platform-admin.service';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../services/platform-admin.service', () => ({
  platformAdminService: {
    getGlobalFlags: vi.fn(),
    setGlobalFlag: vi.fn(),
  },
}));

const mockedService = vi.mocked(platformAdminService);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlatformFeatureFlagsPage />
    </QueryClientProvider>,
  );
}

describe('PlatformFeatureFlagsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders every global flag with a toggle', async () => {
    mockedService.getGlobalFlags.mockResolvedValue({ linear_channels: true, chat: false });
    renderPage();

    expect(await screen.findAllByRole('switch')).toHaveLength(2);
  });

  it('toggling a flag calls PATCH with the flag key and new state', async () => {
    mockedService.getGlobalFlags.mockResolvedValue({ linear_channels: true });
    mockedService.setGlobalFlag.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    const toggle = await screen.findByRole('switch');
    await user.click(toggle);

    await waitFor(() => {
      expect(mockedService.setGlobalFlag).toHaveBeenCalledWith('linear_channels', false);
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('shows an error toast when the PATCH fails', async () => {
    mockedService.getGlobalFlags.mockResolvedValue({ linear_channels: true });
    mockedService.setGlobalFlag.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderPage();

    const toggle = await screen.findByRole('switch');
    await user.click(toggle);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
