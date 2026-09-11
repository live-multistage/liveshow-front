import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { ScrollExpandMedia } from './ScrollExpandMedia';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockMatchMedia(reduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduced : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

describe('ScrollExpandMedia', () => {
  it('renders the media and the overlay content', () => {
    mockMatchMedia(false);
    render(<ScrollExpandMedia media={<div>media</div>} overlay={() => <h1>headline</h1>} />);

    expect(screen.getByText('media')).toBeInTheDocument();
    expect(screen.getByText('headline')).toBeInTheDocument();
  });

  it('never calls scrollTo or preventDefault while scrolling', () => {
    mockMatchMedia(false);
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const { container } = render(<ScrollExpandMedia media={<div>media</div>} overlay={() => <h1>h</h1>} />);
    const section = container.querySelector('section') as HTMLElement;

    const wheelEvent = new WheelEvent('wheel', { deltaY: 2000, cancelable: true });
    const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault');
    window.dispatchEvent(wheelEvent);

    const scrollEvent = new Event('scroll');
    window.dispatchEvent(scrollEvent);

    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(preventDefaultSpy).not.toHaveBeenCalled();
    // Native scroll wasn't hijacked: the section stays mounted and readable.
    expect(section).toBeInTheDocument();
  });

  it('derives progress from the section position, not from wheel/touch deltas', async () => {
    mockMatchMedia(false);
    const { container } = render(<ScrollExpandMedia media={<div>media</div>} overlay={() => <h1>h</h1>} />);
    const section = container.querySelector('section') as HTMLElement;

    vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: window.innerHeight * 2,
    } as DOMRect);

    window.dispatchEvent(new Event('scroll'));

    await waitFor(() => expect(section.style.getPropertyValue('--p')).toBe('0'));

    vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({
      top: -window.innerHeight,
      height: window.innerHeight * 2,
    } as DOMRect);

    window.dispatchEvent(new Event('scroll'));

    await waitFor(() => expect(section).toHaveAttribute('data-expanded', 'true'));
  });

  it('renders fully expanded and static when the user prefers reduced motion', () => {
    mockMatchMedia(true);
    const { container } = render(<ScrollExpandMedia media={<div>media</div>} overlay={() => <h1>h</h1>} />);
    const section = container.querySelector('section') as HTMLElement;

    expect(section).toHaveAttribute('data-expanded', 'true');
    expect(section.style.getPropertyValue('--p')).toBe('1');
  });

  it('hides the scroll hint once progress passes the 0.2 threshold', async () => {
    mockMatchMedia(false);
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ top: 0, height: window.innerHeight * 2 } as DOMRect);

    const { container } = render(
      <ScrollExpandMedia media={<div>media</div>} overlay={() => <h1>h</h1>} hint="role para expandir" />,
    );
    const section = container.querySelector('section') as HTMLElement;

    expect(screen.getByText('role para expandir')).toBeInTheDocument();

    rectSpy.mockReturnValue({ top: -window.innerHeight, height: window.innerHeight * 2 } as DOMRect);
    window.dispatchEvent(new Event('scroll'));

    await waitFor(() => expect(section).toHaveAttribute('data-expanded', 'true'));
    expect(screen.queryByText('role para expandir')).not.toBeInTheDocument();
  });
});
