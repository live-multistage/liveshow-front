import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver; several design-system primitives
// (Radix Select's size tracking, CameraGrid's stage measurement) need it to
// mount at all, even when a test never opens/interacts with them.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
