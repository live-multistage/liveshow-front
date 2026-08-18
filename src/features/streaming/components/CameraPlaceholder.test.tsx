/**
 * Camera placeholder: a visual placeholder shown when a camera tile has no
 * content at the current instant of the replay timeline. Displays only a
 * centered logo over a gradient background, with no text content.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CameraPlaceholder } from './CameraPlaceholder';

vi.mock('@live-show/design-system', () => ({
  Logo: () => <span data-testid="logo">logo</span>,
}));

describe('CameraPlaceholder', () => {
  it('renders the component', () => {
    const { getByTestId } = render(<CameraPlaceholder />);
    expect(getByTestId('logo')).toBeInTheDocument();
  });

  it('marks itself as aria-hidden for accessibility', () => {
    const { container } = render(<CameraPlaceholder />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('contains only the logo element with no additional text', () => {
    const { container, getByTestId } = render(<CameraPlaceholder />);
    const root = container.firstChild as HTMLElement;
    // The root should contain only the mocked Logo element
    expect(root.children.length).toBe(1);
    expect(getByTestId('logo')).toBeInTheDocument();
    // Verify no text content beyond what the logo provides
    const textContent = Array.from(root.childNodes)
      .filter((node) => node.nodeType === 3) // Text nodes only
      .map((node) => node.textContent?.trim())
      .filter(Boolean);
    expect(textContent).toHaveLength(0);
  });

  it('applies the passed className to the root element', () => {
    const { container } = render(<CameraPlaceholder className="custom-class" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('custom-class');
  });
});
