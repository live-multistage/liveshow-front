/**
 * Capa e local de um evento, compartilhado por my-list e wishlist.
 *
 * Os parâmetros são tipos ESTRUTURAIS, não o tipo de uma feature: as duas
 * listas descrevem o mesmo evento com formas diferentes, e tipar isto sobre
 * `AccessibleEvent` obrigava a wishlist a um cast para satisfazer campos
 * (`capabilities`, `canWatchLive`) que estas funções nem leem.
 */
export interface EventCoverSource {
  thumbnailUrl: string | null;
  bannerUrl: string | null;
}

export interface EventPlaceSource {
  venue: string | null;
  city: string | null;
}

/**
 * Gradientes de capa para eventos sem imagem. São os tons de `--chart-*` do
 * design system, e não uma paleta nova: um evento sem capa deve parecer parte
 * da mesma página, não um buraco.
 */
const GRADIENTS = [
  'linear-gradient(135deg, #3b0a24, #ff2e9e 140%)',
  'linear-gradient(135deg, #1c1030, #9b7bff 150%)',
  'linear-gradient(135deg, #2b1208, #ff7a4d 150%)',
  'linear-gradient(135deg, #0a2426, #46d6d8 160%)',
  'linear-gradient(135deg, #0b2418, #7fe0a0 160%)',
];

/**
 * Estável por id: o mesmo evento mostra o mesmo gradiente em toda seção e em
 * toda visita. Um sorteio a cada render faria a página piscar cores diferentes
 * para o mesmo card.
 */
export function coverGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

export function coverUrl(event: EventCoverSource): string | null {
  return event.thumbnailUrl ?? event.bannerUrl;
}

export function placeLabel(event: EventPlaceSource): string {
  return [event.venue, event.city].filter(Boolean).join(' · ');
}
