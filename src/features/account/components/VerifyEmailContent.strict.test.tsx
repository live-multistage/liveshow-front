vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('../services/account.service', () => ({
  accountService: { verifyEmail: vi.fn(() => Promise.resolve()) },
}));

import { StrictMode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VerifyEmailContent } from './VerifyEmailContent';
import { accountService } from '../services/account.service';

// Regression test for a StrictMode hang: a real QueryClient reproduces the
// detached per-call mutation observer, whereas mocking useVerifyEmailMutation
// does not. Only the service is mocked here.
function renderStrict() {
  const queryClient = new QueryClient();
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <VerifyEmailContent token="good-token" />
      </QueryClientProvider>
    </StrictMode>,
  );
}

describe('VerifyEmailContent under StrictMode with a real QueryClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reaches the success state and calls the API exactly once', async () => {
    renderStrict();

    expect(await screen.findByRole('heading', { name: 'success.title' })).toBeInTheDocument();
    expect(accountService.verifyEmail).toHaveBeenCalledTimes(1);
  });
});
