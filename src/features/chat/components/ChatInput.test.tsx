import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './ChatInput';
import type { ChatMe } from '../types/chat.types';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/events/evt-1',
}));

const me = (overrides: Partial<ChatMe> = {}): ChatMe => ({
  canWrite: true,
  isMuted: false,
  isModerator: false,
  ...overrides,
});

describe('ChatInput', () => {
  it('anonymous (me === null) shows the join link with returnTo/redirect to the current path', () => {
    render(<ChatInput onSend={vi.fn()} me={null} />);

    expect(screen.getByText('joinToChat')).toBeInTheDocument();
    const link = screen.getByText('login');
    expect(link).toHaveAttribute('href', `/login?redirect=${encodeURIComponent('/events/evt-1')}`);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('muted disables the input with the muted placeholder', () => {
    render(<ChatInput onSend={vi.fn()} me={me({ isMuted: true, canWrite: false })} />);

    const input = screen.getByPlaceholderText('muted');
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'send' })).toBeDisabled();
  });

  it('normal state sends the trimmed text and clears the input', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} me={me()} />);

    const input = screen.getByPlaceholderText('placeholder');
    fireEvent.change(input, { target: { value: '  oi tudo bem  ' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(onSend).toHaveBeenCalledWith('oi tudo bem');
    expect(input).toHaveValue('');
  });
});
