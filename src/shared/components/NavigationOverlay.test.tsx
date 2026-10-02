import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigationLoadingStore } from '@/shared/stores/navigation-loading.store';
import { NavigationOverlay } from './NavigationOverlay';

describe('NavigationOverlay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    act(() => useNavigationLoadingStore.getState().stop());
  });

  it('renders nothing while not navigating', () => {
    const { container } = render(<NavigationOverlay />);
    expect(container).toBeEmptyDOMElement();
  });

  it('deals the next poster to the front each cycle', () => {
    act(() => useNavigationLoadingStore.getState().start());
    const { container } = render(<NavigationOverlay />);
    const front = () => container.querySelector('[data-pos="0"]');

    expect(screen.getByRole('status')).toHaveTextContent('Shows');
    expect(front()).toHaveTextContent('01');

    act(() => { vi.advanceTimersByTime(2400); });

    expect(screen.getByRole('status')).toHaveTextContent('Esportes');
    expect(front()).toHaveTextContent('02');
    expect(container.querySelector('[data-pos="4"]')).toHaveTextContent('01');
  });
});
