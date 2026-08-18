import type { FaqEntry, FaqFilter } from '../types/faq.types';

/**
 * A busca precisa olhar a RESPOSTA também, não só a pergunta: quem procura
 * "reembolso" ou "multicâmera" costuma usar a palavra que está no corpo do
 * texto, não a que abre a pergunta. Por isso o chamador passa o texto já
 * traduzido — o filtro não sabe de i18n.
 */
export interface SearchableFaq extends FaqEntry {
  question: string;
  answer: string;
}

export function filterFaqs(
  faqs: SearchableFaq[],
  { query = '', filter = 'all' }: { query?: string; filter?: FaqFilter } = {},
): SearchableFaq[] {
  const normalized = query.trim().toLowerCase();

  return faqs.filter((faq) => {
    if (filter !== 'all' && faq.category !== filter) return false;
    if (!normalized) return true;
    return `${faq.question} ${faq.answer}`.toLowerCase().includes(normalized);
  });
}
