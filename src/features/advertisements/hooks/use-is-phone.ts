'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 820px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia?.(QUERY);
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}

// Celular = até 820px (mesmo ponto de quebra do restante do app). No servidor
// assume computador: o anúncio só aparece depois de uma pausa, já no cliente.
export function useIsPhone(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia?.(QUERY).matches ?? false, () => false);
}
