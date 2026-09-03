import { test, expect } from 'vitest';
import {
  cameraSelectionReducer, effectiveMainCameraId, INITIAL_CAMERA_SELECTION,
  type CameraSelectionState, type SelectableCamera,
} from './camera-selection';

const cam = (cameraId: string, priority: number, playable = true): SelectableCamera => ({ cameraId, priority, playable });
const five = [cam('a', 0), cam('b', 1), cam('c', 2), cam('d', 3), cam('e', 4)];

function init(cameras: SelectableCamera[], primary: string | null, libras: string | null = null): CameraSelectionState {
  return cameraSelectionReducer(INITIAL_CAMERA_SELECTION, {
    type: 'INIT', cameras, primaryCameraId: primary, librasCameraId: libras, cap: 4,
  });
}

test('INIT fills up to the cap, primary first then by priority', () => {
  const state = init(five, 'c');
  expect(state.activeCameraIds).toEqual(['c', 'a', 'b', 'd']);
  expect(effectiveMainCameraId(state)).toBe('c');
});

test('a non-playable camera is never activated', () => {
  const state = init([cam('a', 0, false), cam('b', 1), cam('c', 2)], 'a');
  expect(state.activeCameraIds).toEqual(['b', 'c']);
  expect(effectiveMainCameraId(state)).toBe('b');
});

test('Libras is always kept and counts against the cap, but is never the main', () => {
  const state = init(five, 'a', 'e');
  expect(state.activeCameraIds).toContain('e');
  expect(state.activeCameraIds).toHaveLength(4);
  expect(effectiveMainCameraId(state)).toBe('a');
  const tried = cameraSelectionReducer(state, { type: 'SET_MAIN', cameraId: 'e' });
  expect(effectiveMainCameraId(tried)).toBe('a');
});

test('SET_MAIN only promotes an active camera', () => {
  const state = init(five, 'a');
  expect(effectiveMainCameraId(cameraSelectionReducer(state, { type: 'SET_MAIN', cameraId: 'b' }))).toBe('b');
  expect(effectiveMainCameraId(cameraSelectionReducer(state, { type: 'SET_MAIN', cameraId: 'e' }))).toBe('a');
});

test('SYNC drops a vanished camera and refills from the payload', () => {
  const state = cameraSelectionReducer(init(five, 'a'), { type: 'SET_MAIN', cameraId: 'b' });
  const synced = cameraSelectionReducer(state, { type: 'SYNC', cameras: [cam('a', 0), cam('c', 2), cam('e', 4)] });
  expect(synced.activeCameraIds).toEqual(['a', 'c', 'e']);
  expect(effectiveMainCameraId(synced)).toBe('a');
});

test('SYNC keeps the main when it survives', () => {
  const state = cameraSelectionReducer(init(five, 'a'), { type: 'SET_MAIN', cameraId: 'b' });
  const synced = cameraSelectionReducer(state, { type: 'SYNC', cameras: [cam('b', 1), cam('c', 2)] });
  expect(effectiveMainCameraId(synced)).toBe('b');
});
