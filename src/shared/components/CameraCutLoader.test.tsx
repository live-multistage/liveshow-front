import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraCutLoader } from './CameraCutLoader';

describe('CameraCutLoader', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the label', () => {
    render(<CameraCutLoader label="Carregando" />);
    expect(screen.getByText('Carregando')).toBeInTheDocument();
  });

  it('cuts to exactly one live camera at a time', () => {
    const { container } = render(<CameraCutLoader />);
    const liveTiles = () => container.querySelectorAll('[data-state="live"]');
    expect(liveTiles()).toHaveLength(1);
    const first = liveTiles()[0];

    act(() => { vi.advanceTimersByTime(360); });

    expect(liveTiles()).toHaveLength(1);
    expect(liveTiles()[0]).not.toBe(first);
  });
});
