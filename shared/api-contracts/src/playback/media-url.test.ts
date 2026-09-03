import { test, expect } from 'vitest';
import { extractPt, stripPt, replacePtParam, hasCdnSignature, isAbsoluteMediaUrl, resolveMediaUrl } from './media-url';

const CDN = 'https://cdn.x/api/packages/p1/live/master.m3u8?token_path=%2Fapi%2Fpackages%2Fp1%2F&token=SIG&expires=99';

test('resolveMediaUrl prefixes relative paths only', () => {
  expect(resolveMediaUrl('http://h/api', '/packages/p/replay/master.m3u8')).toBe('http://h/api/packages/p/replay/master.m3u8');
  expect(resolveMediaUrl('http://h/api', 'https://cdn.x/a.m3u8')).toBe('https://cdn.x/a.m3u8');
  expect(isAbsoluteMediaUrl('https://cdn.x/a')).toBe(true);
  expect(isAbsoluteMediaUrl('/a')).toBe(false);
});

test('hasCdnSignature keys on token_path, not on the scheme', () => {
  expect(hasCdnSignature(CDN)).toBe(true);
  expect(hasCdnSignature('https://api.x/packages/p/live/master.m3u8?pt=A')).toBe(false);
  expect(hasCdnSignature('/packages/p/live/master.m3u8')).toBe(false);
});

test('extractPt reads pt, falls back to legacy token only off a CDN URL', () => {
  expect(extractPt('/a.m3u8?pt=A')).toBe('A');
  expect(extractPt('/a.m3u8?token=A')).toBe('A');
  expect(extractPt(CDN)).toBeNull();
  expect(extractPt('/a.m3u8')).toBeNull();
});

test('stripPt yields a stable source identity — drops every rotating token', () => {
  expect(stripPt('/a.m3u8?pt=A')).toBe('/a.m3u8');
  expect(stripPt('/a.m3u8?token=A')).toBe('/a.m3u8');
  // The Bunny signature rotates every ~150s bucket; it must NOT be part of the
  // source-identity key, or the player rebuilds every rotation and stalls on
  // the live resync. Stripped down to the path.
  expect(stripPt(CDN)).toBe('https://cdn.x/api/packages/p1/live/master.m3u8');
  expect(stripPt(`${CDN}&pt=A`)).toBe('https://cdn.x/api/packages/p1/live/master.m3u8');
});

test('replacePtParam rewrites only the viewer token', () => {
  expect(replacePtParam('/a.m3u8?pt=A', 'B')).toBe('/a.m3u8?pt=B');
  expect(replacePtParam('/a.m3u8?token=A', 'B')).toBe('/a.m3u8?token=B');
  expect(replacePtParam(CDN, 'B')).toBe(CDN);
  expect(replacePtParam('/a.m3u8?pt=A', null)).toBe('/a.m3u8?pt=A');
  expect(replacePtParam('/a.m3u8', 'B')).toBe('/a.m3u8');
});
