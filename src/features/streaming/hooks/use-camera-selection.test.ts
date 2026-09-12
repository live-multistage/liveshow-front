import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCameraSelection } from './use-camera-selection';

describe('useCameraSelection — active cap', () => {
  it('ignores a 5th active camera', () => {
    const { result } = renderHook(() => useCameraSelection({ initialActiveIds: ['a', 'b', 'c', 'd'] }));
    act(() => result.current.toggleCamera('e'));
    expect(result.current.activeCameraIds).toEqual(['a', 'b', 'c', 'd']);
    expect(result.current.isFull).toBe(true);
  });

  it('does not count the Libras window towards the cap', () => {
    const { result } = renderHook(() =>
      useCameraSelection({ initialActiveIds: ['libras', 'a', 'b', 'c'], librasCameraId: 'libras' }),
    );
    expect(result.current.isFull).toBe(false);
    act(() => result.current.toggleCamera('d'));
    expect(result.current.activeCameraIds).toContain('d');
    expect(result.current.isFull).toBe(true);
  });

  it('still lets a full composition remove a camera', () => {
    const { result } = renderHook(() => useCameraSelection({ initialActiveIds: ['a', 'b', 'c', 'd'] }));
    act(() => result.current.toggleCamera('b'));
    expect(result.current.activeCameraIds).toEqual(['a', 'c', 'd']);
    expect(result.current.isFull).toBe(false);
  });
});
