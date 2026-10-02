import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useNavigationLoadingStore } from '@/shared/stores/navigation-loading.store';
import { NavigationOverlay } from './NavigationOverlay';

describe('NavigationOverlay', () => {
  afterEach(() => {
    act(() => useNavigationLoadingStore.getState().stop());
  });

  it('renders nothing while not navigating', () => {
    const { container } = render(<NavigationOverlay />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the camera-cut loader while navigating', () => {
    act(() => useNavigationLoadingStore.getState().start());
    render(<NavigationOverlay />);
    expect(screen.getByRole('status')).toHaveTextContent('CARREGANDO');
    expect(screen.getByText('CAM 01')).toBeInTheDocument();
  });
});
