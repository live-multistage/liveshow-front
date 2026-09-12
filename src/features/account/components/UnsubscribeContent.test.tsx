vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock('../mutations/use-unsubscribe.mutation', () => ({ useUnsubscribeMutation: vi.fn() }));

import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UnsubscribeContent } from './UnsubscribeContent';
import { useUnsubscribeMutation } from '../mutations/use-unsubscribe.mutation';

const mocked = vi.mocked(useUnsubscribeMutation);

describe('UnsubscribeContent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the loading card while unsubscribing', () => {
    mocked.mockReturnValue({ mutate: vi.fn() } as never);
    render(<UnsubscribeContent token="tok" />);
    expect(screen.getByRole('heading', { name: 'loading.title' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'loading.spinnerLabel' })).toBeInTheDocument();
  });

  it('POSTs once (even under StrictMode) and shows success with a preferences link', async () => {
    const mutate = vi.fn((_t: string) => {});
    mocked.mockImplementation((opts) => {
      mutate.mockImplementation((t: string) => opts?.onSuccess?.(undefined, t, undefined, undefined as never));
      return { mutate } as never;
    });
    render(<StrictMode><UnsubscribeContent token="tok" /></StrictMode>);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'success.title' })).toBeInTheDocument());
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith('tok');
    expect(screen.getByRole('status')).toHaveTextContent('success.message');
    expect(screen.getByRole('link', { name: 'success.primary' })).toHaveAttribute('href', '/settings');
  });

  it('shows the invalid state on a rejected token', async () => {
    const mutate = vi.fn((_t: string) => {});
    mocked.mockImplementation((opts) => {
      mutate.mockImplementation((t: string) => opts?.onError?.(new Error('nope') as never, t, undefined, undefined as never));
      return { mutate } as never;
    });
    render(<UnsubscribeContent token="bad" />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'invalid.title' })).toBeInTheDocument());
  });

  it('without a token goes straight to invalid and never calls the API', () => {
    const mutate = vi.fn();
    mocked.mockReturnValue({ mutate } as never);
    render(<UnsubscribeContent />);
    expect(screen.getByRole('heading', { name: 'invalid.title' })).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
