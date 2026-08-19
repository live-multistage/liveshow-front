import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgePersonalizationPrompt } from './AgePersonalizationPrompt';
import { getMe } from '../queries/get-me';
import { httpClient } from '@/lib/http/client';
import type { AuthUser } from '../types/account.types';

vi.mock('../queries/get-me', () => ({ getMe: vi.fn() }));
vi.mock('@/lib/http/client', () => ({ httpClient: { patch: vi.fn() } } as unknown as { httpClient: unknown }));

let mockIsLoggedIn = true;
vi.mock('../hooks/use-auth', () => ({ useAuth: () => ({ isLoggedIn: mockIsLoggedIn }) }));
vi.mock('../context/AuthProvider', () => ({ useAuthContextValue: () => ({ login: vi.fn() }) }));

const mockedGetMe = vi.mocked(getMe);
const mockedPatch = vi.mocked(httpClient.patch);

const baseUser: AuthUser = {
  id: 'u-1',
  email: 'user@example.com',
  displayName: 'Test User',
  role: 'USER',
  ageBracket: null,
};

function renderPrompt() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AgePersonalizationPrompt />
    </QueryClientProvider>,
  );
}

describe('AgePersonalizationPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsLoggedIn = true;
    mockedPatch.mockResolvedValue({ data: { ...baseUser, ageBracket: 'AGE_25_34' } });
  });

  it('shows the modal when ageBracket is null and the prompt was never dismissed', async () => {
    mockedGetMe.mockResolvedValue(baseUser);
    renderPrompt();

    expect(await screen.findByText('Sua faixa etária')).toBeInTheDocument();
  });

  it('stays hidden when ageBracket is already set', async () => {
    mockedGetMe.mockResolvedValue({ ...baseUser, ageBracket: 'AGE_18_24' });
    renderPrompt();

    await waitFor(() => expect(mockedGetMe).toHaveBeenCalled());
    expect(screen.queryByText('Sua faixa etária')).not.toBeInTheDocument();
  });

  it('stays hidden when previously dismissed', async () => {
    localStorage.setItem('agePrompt:dismissed', '1');
    mockedGetMe.mockResolvedValue(baseUser);
    renderPrompt();

    await waitFor(() => expect(mockedGetMe).toHaveBeenCalled());
    expect(screen.queryByText('Sua faixa etária')).not.toBeInTheDocument();
  });

  it('selecting a bracket and saving calls the update-profile mutation with the chosen bracket', async () => {
    mockedGetMe.mockResolvedValue(baseUser);
    const user = userEvent.setup();
    renderPrompt();

    await screen.findByText('Sua faixa etária');
    await user.click(screen.getByText('25–34'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith('/auth/me', { ageBracket: 'AGE_25_34' });
    });
  });

  it('"Pular" dismisses the modal and persists the flag to localStorage', async () => {
    mockedGetMe.mockResolvedValue(baseUser);
    const user = userEvent.setup();
    renderPrompt();

    await screen.findByText('Sua faixa etária');
    await user.click(screen.getByRole('button', { name: 'Pular' }));

    expect(localStorage.getItem('agePrompt:dismissed')).toBe('1');
    await waitFor(() => {
      expect(screen.queryByText('Sua faixa etária')).not.toBeInTheDocument();
    });
  });
});
