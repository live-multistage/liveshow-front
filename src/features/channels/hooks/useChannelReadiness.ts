'use client';

import type { ChannelAccessMode } from '../types/channel.types';

export type ReadinessItemId = 'cameras' | 'programs' | 'pricing';

export interface ReadinessItem {
  id: ReadinessItemId;
  done: boolean;
  /** Bloqueia a publicação enquanto pendente (a grade é só recomendada). */
  required: boolean;
}

export interface ChannelReadiness {
  items: ReadinessItem[];
  doneCount: number;
  total: number;
  /** Nada obrigatório pendente — o canal pode ser publicado. */
  ready: boolean;
}

interface Input {
  accessMode: ChannelAccessMode;
  pricingSynced: boolean;
  cameraCount: number;
  // Cameras from the channel's own broadcast event and from its Programs'
  // streams both count toward "has at least one camera" — either can carry
  // the channel on air.
  programCameraCount?: number;
  programCount?: number;
}

/**
 * Checklist "para ir ao ar". Câmeras e (em canal por assinatura) preços
 * sincronizados são obrigatórios — é o que o backend recusa no publish; a grade
 * de programação é recomendada e conta só no progresso.
 */
export function useChannelReadiness({
  accessMode,
  pricingSynced,
  cameraCount,
  programCameraCount = 0,
  programCount = 0,
}: Input): ChannelReadiness {
  const isSubscription = accessMode === 'SUBSCRIPTION';

  const items: ReadinessItem[] = [
    { id: 'cameras', done: cameraCount + programCameraCount > 0, required: true },
    { id: 'programs', done: programCount > 0, required: false },
    // Canal gratuito não tem o que sincronizar: o item nasce concluído.
    { id: 'pricing', done: isSubscription ? pricingSynced : true, required: isSubscription },
  ];

  return {
    items,
    doneCount: items.filter((item) => item.done).length,
    total: items.length,
    ready: items.every((item) => !item.required || item.done),
  };
}
