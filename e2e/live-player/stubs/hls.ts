// Test-only: the real hls.js, with each instance reachable from its <video> so
// the suite can read what hls.js decided (latency target, catch-up window).
import RealHls from 'hls.js/dist/hls.mjs';

declare global {
  interface Window {
    __hlsOf: WeakMap<HTMLMediaElement, RealHls>;
  }
}
window.__hlsOf = new WeakMap();

export default class Hls extends RealHls {
  attachMedia(media: HTMLMediaElement) {
    window.__hlsOf.set(media, this);
    super.attachMedia(media);
  }
}
