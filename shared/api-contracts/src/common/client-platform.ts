// Sent as `x-client-platform` on every request the apps make; the backend
// falls back to 'web' when it is absent, so the mobile-only flows stay closed
// to anything that does not identify itself.
export type ClientPlatform = 'ios' | 'android' | 'web';
