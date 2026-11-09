import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

// False on the server and during hydration, true once React owns the DOM.
// Auth forms gate their submit button on it: a click before hydration would
// fall through to the browser's native form submit.
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
