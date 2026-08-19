export type FaqCategory = 'tickets' | 'streaming' | 'replays' | 'account';

/** Filtro da barra de categorias — 'all' não é categoria de pergunta. */
export type FaqFilter = 'all' | FaqCategory;

/**
 * Só id e categoria vivem em código. Pergunta e resposta vêm do i18n
 * (`help.faq.<id>.q` / `.a`): são texto de produto em três idiomas, e
 * duplicá-los aqui garantiria que uma tradução ficasse para trás.
 */
export interface FaqEntry {
  id: string;
  category: FaqCategory;
}
