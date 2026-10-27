vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UsernameField } from './UsernameField';
import type { UsernameFieldState } from '../utils/username-field-state';

function field(state: UsernameFieldState, draft = 'joana.martins') {
  return {
    draft,
    setDraft: vi.fn(),
    state,
    dirty: state.kind !== 'current' && state.kind !== 'cooldown',
    canSave: state.kind === 'available',
    saving: false,
    save: vi.fn(),
    reset: vi.fn(),
  };
}

describe('UsernameField', () => {
  it.each([
    [{ kind: 'available' }, 'available'],
    [{ kind: 'checking' }, 'checking'],
    [{ kind: 'taken' }, 'taken'],
    [{ kind: 'reserved' }, 'reserved'],
    [{ kind: 'invalid' }, 'invalid'],
  ] as const)('shows the %o status', (state, text) => {
    render(<UsernameField field={field(state)} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('renders no status text when unverified', () => {
    render(<UsernameField field={field({ kind: 'unverified' })} />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('labels the input, shows the @ prefix, the n/30 counter and the help line', () => {
    render(<UsernameField field={field({ kind: 'current' }, 'joana.m')} />);
    expect(screen.getByLabelText('label')).toHaveValue('joana.m');
    expect(screen.getByText('@')).toBeInTheDocument();
    expect(screen.getByText('7/30')).toBeInTheDocument();
    expect(screen.getByText('help')).toBeInTheDocument();
  });

  it('disables the input during the cooldown and says for how long', () => {
    render(<UsernameField field={field({ kind: 'cooldown', days: 12 }, 'joana.m')} />);
    expect(screen.getByLabelText('label')).toBeDisabled();
    expect(screen.getByText('cooldown:{"days":12}')).toBeInTheDocument();
  });

  it('marks invalid states for assistive tech and forwards typing', () => {
    const f = field({ kind: 'taken' });
    render(<UsernameField field={f} />);
    const input = screen.getByLabelText('label');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(input, { target: { value: 'nova' } });
    expect(f.setDraft).toHaveBeenCalledWith('nova');
  });
});
