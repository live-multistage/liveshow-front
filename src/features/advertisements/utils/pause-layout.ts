import type { AdPauseVariant } from '../types/advertisement.types';

export type PauseLayout = AdPauseVariant;

// Celular sempre Tela cheia: o card da variante Padrão fica pequeno demais.
// Anúncio antigo sem variante vale Padrão.
export function resolvePauseLayout(variant: AdPauseVariant | null | undefined, isPhone: boolean): PauseLayout {
  if (isPhone) return 'FULLSCREEN';
  return variant ?? 'STANDARD';
}
