import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Reveal } from './Reveal';

describe('Reveal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders visible immediately when IntersectionObserver is unavailable (jsdom)', () => {
    render(<Reveal>content</Reveal>);
    expect(screen.getByText('content').className).toContain('visible');
  });

  it('becomes visible and unobserves once the mocked observer reports an intersection', () => {
    const unobserve = vi.fn();
    let trigger: (entries: { isIntersecting: boolean }[]) => void = () => {};

    class FakeIntersectionObserver {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        trigger = callback;
      }
      observe = vi.fn();
      unobserve = unobserve;
      disconnect = vi.fn();
    }

    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

    render(<Reveal>observed</Reveal>);
    const el = screen.getByText('observed');
    expect(el.className).not.toContain('visible');

    act(() => {
      trigger([{ isIntersecting: true }]);
    });

    expect(el.className).toContain('visible');
    expect(unobserve).toHaveBeenCalled();
  });
});
