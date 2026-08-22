import type { EventResponse } from '@/features/events/types/event.types';

// Vinculável = do mesmo org, formato ao vivo, ainda não encerrado. Usado tanto
// pelo painel "no ar agora" (override manual) quanto pelo form de programa
// (vínculo automático) — o backend valida as mesmas invariantes de novo no
// upsert/override; isto é só o filtro da lista.
export function filterLinkableEvents<T extends EventResponse>(
  events: T[],
  organizationId: string,
): T[] {
  return events.filter(
    (event) =>
      event.organizationId === organizationId &&
      event.format === 'LIVE' &&
      (event.status === 'SCHEDULED' || event.status === 'LIVE'),
  );
}
