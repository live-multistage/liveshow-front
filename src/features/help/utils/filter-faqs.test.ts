import { describe, it, expect } from 'vitest';
import { filterFaqs, type SearchableFaq } from './filter-faqs';

const faq = (over: Partial<SearchableFaq> & { id: string }): SearchableFaq => ({
  category: 'tickets',
  question: 'Pergunta',
  answer: 'Resposta',
  ...over,
});

const FAQS: SearchableFaq[] = [
  faq({ id: 'a', category: 'tickets', question: 'Onde encontro meu evento?', answer: 'Em Minha lista.' }),
  faq({ id: 'b', category: 'replays', question: 'Por quanto tempo?', answer: 'O prazo está na página do evento.' }),
  faq({ id: 'c', category: 'account', question: 'Como peço reembolso?', answer: 'Fale com o suporte.' }),
];

describe('filterFaqs', () => {
  it('returns everything under the default filter', () => {
    expect(filterFaqs(FAQS)).toHaveLength(3);
  });

  it('narrows to a single category', () => {
    expect(filterFaqs(FAQS, { filter: 'replays' }).map((f) => f.id)).toEqual(['b']);
  });

  /**
   * A razão de o filtro receber pergunta E resposta: quem busca "suporte" ou
   * "Minha lista" usa a palavra que está no corpo do texto, não no título.
   */
  it('searches the answer body, not just the question', () => {
    expect(filterFaqs(FAQS, { query: 'suporte' }).map((f) => f.id)).toEqual(['c']);
    expect(filterFaqs(FAQS, { query: 'minha lista' }).map((f) => f.id)).toEqual(['a']);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(filterFaqs(FAQS, { query: '  REEMBOLSO ' }).map((f) => f.id)).toEqual(['c']);
  });

  it('combines category and search, not one or the other', () => {
    expect(filterFaqs(FAQS, { filter: 'tickets', query: 'reembolso' })).toEqual([]);
  });

  it('returns empty when nothing matches, rather than falling back to everything', () => {
    expect(filterFaqs(FAQS, { query: 'zzz' })).toEqual([]);
  });
});
