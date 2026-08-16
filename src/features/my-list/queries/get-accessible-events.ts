'use client';

import { useQuery } from '@tanstack/react-query';
import { myListService } from '../services/my-list.service';

export const myListKeys = {
  accessibleEvents: ['me', 'accessible-events'] as const,
};

export function useAccessibleEventsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: myListKeys.accessibleEvents,
    queryFn: () => myListService.getAccessibleEvents(),
    enabled: options?.enabled !== false,
    // Curto: um evento pode entrar AO VIVO enquanto a página está aberta, e o
    // botão muda de "Ver detalhes" para "Assistir" com o status.
    staleTime: 30_000,
  });
}
