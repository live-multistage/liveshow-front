// Single source of truth for house-ad label maps and the edit-status gate.
// Before this file, HouseAdsTab, HouseAdReportDrawer, Step2PlacementsAudience
// and Step4Review each kept their own copy and had already drifted
// ("Pre-roll"/"Pré-roll", "Página do evento"/"Detalhe do evento").
import type { HouseAdFormat, HouseAdPlacement, HouseAdPriority, HouseAdStatus } from './types/house-ads.types';

export const HOUSE_AD_FORMAT_LABEL: Record<HouseAdFormat, string> = {
  HORIZONTAL_728x90: '728×90',
  VERTICAL_300x600: '300×600',
  WIDE_16_9: '16:9',
  VIDEO_16_9: 'Vídeo 16:9',
};

export const HOUSE_AD_PLACEMENT_LABEL: Record<HouseAdPlacement, string> = {
  FEED: 'Feed',
  EVENT_DETAIL: 'Página do evento',
  CHECKOUT: 'Checkout',
  POST_PURCHASE: 'Pós-compra',
  PLAYER_PAUSE: 'Pausa no player',
  PRE_ROLL: 'Pre-roll',
};

export const HOUSE_AD_STATUS_LABEL: Record<HouseAdStatus, string> = {
  DRAFT: 'Rascunho',
  REVIEW: 'Revisão',
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  ENDED: 'Encerrado',
  REJECTED: 'Rejeitado',
};

export const HOUSE_AD_PRIORITY_LABEL: Record<HouseAdPriority, string> = {
  PRIORITY: 'Prioritário',
  FILL: 'Preenchimento',
};

// Mirrors src/advertisements/domain/ad.entity.ts Ad.update() (orchestrator):
// it only allows editing a DRAFT or PAUSED ad. Any UI surface that offers an
// "Editar" action for a house ad must gate it through this helper — an
// ACTIVE/ENDED/REJECTED ad 500s on PATCH otherwise.
export function canEditHouseAd(status: HouseAdStatus): boolean {
  return status === 'DRAFT' || status === 'PAUSED';
}
