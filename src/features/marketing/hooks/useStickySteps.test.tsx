import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useActiveStep } from './useStickySteps';

function Harness({ stepCount, onRender }: { stepCount: number; onRender: (active: number) => void }) {
  const [active, setRef] = useActiveStep(stepCount);
  onRender(active);
  return (
    <div>
      {Array.from({ length: stepCount }).map((_, i) => (
        <div key={i} ref={(el) => setRef(i, el)} data-testid={`step-${i}`} />
      ))}
    </div>
  );
}

describe('useActiveStep', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('computes the active step once on mount, before any scroll event', () => {
    const centers = [800, 400];
    let call = 0;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          top: centers[call++ % centers.length],
          height: 0,
        }) as DOMRect,
    );
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });

    const values: number[] = [];
    render(<Harness stepCount={2} onRender={(a) => values.push(a)} />);

    // Effects flush synchronously in the test renderer, so the mount-time
    // computeActive() call should already have picked step 1 (closer to center).
    expect(values[values.length - 1]).toBe(1);
  });

  it('updates the active step on scroll and removes listeners on unmount', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 0, height: 0 } as DOMRect);
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<Harness stepCount={1} onRender={() => {}} />);

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function), { passive: true });

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('reacts to a scroll event by recomputing the closest step', () => {
    let closeToTop = true;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ top: closeToTop ? 300 : 900, height: 0 }) as DOMRect,
    );
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });

    const values: number[] = [];
    render(<Harness stepCount={2} onRender={(a) => values.push(a)} />);

    closeToTop = false;
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(values[values.length - 1]).toBe(0);
    rafSpy.mockRestore();
  });
});
