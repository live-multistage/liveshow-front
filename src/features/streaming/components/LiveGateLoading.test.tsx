import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveGateLoading } from './LiveGateLoading';

describe('LiveGateLoading', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('announces the message and event title', () => {
    render(<LiveGateLoading message="Carregando transmissão" eventTitle="Show X" />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando transmissão');
    expect(screen.getByRole('heading', { name: 'Show X' })).toBeInTheDocument();
  });

  it('cuts to exactly one live camera at a time', () => {
    const { container } = render(<LiveGateLoading />);
    const liveTiles = () => container.querySelectorAll('[data-state="live"]');
    expect(liveTiles()).toHaveLength(1);
    const first = liveTiles()[0];

    act(() => { vi.advanceTimersByTime(360); });

    expect(liveTiles()).toHaveLength(1);
    expect(liveTiles()[0]).not.toBe(first);
  });
});
