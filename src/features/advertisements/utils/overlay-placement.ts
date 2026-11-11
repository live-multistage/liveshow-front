import type { AdOverlayPosition } from '../types/advertisement.types';

// Borda esquerda de cada painel que flutua à direita do player, em px:
// ChatDock 320 + right 1.25rem; gaveta de capítulos 352; gaveta de câmeras 220.
export const OVERLAY_INSET_PX = { chat: 340, chapters: 352, cameraDrawer: 220 } as const;

export interface OverlayPlacementInput {
  position: AdOverlayPosition;
  isPhone: boolean;
  chatOpen: boolean;
  chaptersOpen: boolean;
  cameraDrawerOpen: boolean;
  hasLibras: boolean;
  // Uma câmera secundária em PiP, empilhada sobre a janela de Libras.
  hasPip: boolean;
  fullscreen: boolean;
}

export interface OverlayPlacement {
  position: AdOverlayPosition;
  // Largura ocupada por painéis à direita: a área da vitrine termina nela.
  insetPx: number;
  hidden: boolean;
  // Rodapé em tela cheia sobe acima da pílula de recomendados.
  raised: boolean;
}

// Onde a vitrine fica dado o que está aberto no player (SDD §8). Nunca cobre
// controles, chat, Libras nem PiP: em vez de sobrepor, muda de lugar ou some.
export function resolveOverlayPlacement(input: OverlayPlacementInput): OverlayPlacement {
  const { isPhone } = input;

  if (isPhone) {
    // Celular: só Topo e Rodapé, e o chat vira tela cheia.
    return {
      position: input.position === 'SIDE' ? 'BOTTOM' : input.position,
      insetPx: 0,
      hidden: input.chatOpen,
      raised: false,
    };
  }

  const position = input.position === 'SIDE' && input.hasLibras && input.hasPip ? 'TOP' : input.position;
  const insetPx = Math.max(
    input.chatOpen ? OVERLAY_INSET_PX.chat : 0,
    input.chaptersOpen ? OVERLAY_INSET_PX.chapters : 0,
    input.cameraDrawerOpen ? OVERLAY_INSET_PX.cameraDrawer : 0,
  );
  return { position, insetPx, hidden: false, raised: position === 'BOTTOM' && input.fullscreen };
}
