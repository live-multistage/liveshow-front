import { describe, it, expect } from 'vitest';
import { hlsAudioTrackName, pickAudioTrackIndex } from './audio-tracks';
import type { AudioTrackInfo } from './audio-tracks';

const tracks: AudioTrackInfo[] = [
  { index: 0, language: 'por', label: null, default: true },
  { index: 1, language: 'eng', label: null, default: false },
];

describe('hlsAudioTrackName', () => {
  it('matches the backend stage-master NAME rule', () => {
    expect(hlsAudioTrackName('cam-1', 0)).toBe('cam-1');
    expect(hlsAudioTrackName('cam-1', 1)).toBe('cam-1:1');
  });
});

describe('pickAudioTrackIndex', () => {
  it('picks the preferred language when the camera has it', () => {
    expect(pickAudioTrackIndex(tracks, 'eng')).toBe(1);
  });
  it('falls back to the default track when the language is missing', () => {
    expect(pickAudioTrackIndex(tracks, 'spa')).toBe(0);
    expect(pickAudioTrackIndex(tracks, null)).toBe(0);
  });
  it('is 0 for a camera without a track list', () => {
    expect(pickAudioTrackIndex(undefined, 'eng')).toBe(0);
  });
});
