import { describe, it, expect } from 'vitest';
import { audioTrackIndexForCamera } from './audio-track';

const tracks = [
  { id: 0, name: 'cam-a' },
  { id: 1, name: 'cam-a:1' },
  { id: 2, name: 'cam-b' },
];

describe('audioTrackIndexForCamera', () => {
  it('selects the camera program track by default', () => {
    expect(audioTrackIndexForCamera(tracks, 'cam-b')).toBe(2);
  });
  it('selects a language track by camera and index', () => {
    expect(audioTrackIndexForCamera(tracks, 'cam-a', 1)).toBe(1);
  });
  it('falls back to the program track when the language track is not listed', () => {
    expect(audioTrackIndexForCamera(tracks, 'cam-b', 2)).toBe(2);
  });
  it('is -1 without a camera or a match', () => {
    expect(audioTrackIndexForCamera(tracks, undefined, 1)).toBe(-1);
    expect(audioTrackIndexForCamera(tracks, 'cam-zz')).toBe(-1);
  });
});
