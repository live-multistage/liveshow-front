import {
  PAGE_SECTION_TYPES, createEmptySection, upgradePageDocument, type PageElement, type PageSection, type PageSectionType,
} from '@live-show/api-contracts';

// A starter content per v1 section type: the empty sections of the v1 editor would insert blank titles.
const EXAMPLES: { [K in PageSectionType]: Record<string, unknown> } = {
  hero: { title: 'Seu próximo evento começa aqui', subtitle: 'Transmissões ao vivo, ingressos e bastidores em um só lugar.', primaryCta: { label: 'Ver eventos', href: '/events' } },
  audience: { text: 'Milhares de pessoas assistem aos eventos da plataforma.', counters: [{ value: '10 mil', label: 'espectadores' }] },
  text: { title: 'Sobre o evento', paragraphs: [[{ text: 'Conte aqui o que o público vai encontrar.' }]] },
  features: { title: 'Por que participar', items: [{ title: 'Ao vivo', text: 'Assista de onde estiver.' }, { title: 'Replay', text: 'Reveja quando quiser.' }] },
  how: { title: 'Como funciona', steps: [{ title: 'Escolha', text: 'Encontre o evento.' }, { title: 'Garanta', text: 'Compre o ingresso.' }, { title: 'Assista', text: 'Entre na transmissão.' }] },
  media: { kind: 'image', url: '', alt: 'Imagem do evento' },
  stats: { title: 'Em números', items: [{ value: '120', label: 'eventos' }, { value: '30 mil', label: 'ingressos' }] },
  rail: { title: 'Eventos ao vivo', source: { kind: 'live' }, limit: 8 },
  featured: { eventId: '' },
  pricing: { title: 'Planos', plans: [{ name: 'Básico', price: 'R$ 0' }, { name: 'Completo', price: 'R$ 29' }] },
  faq: { title: 'Perguntas frequentes', items: [{ question: 'Como compro um ingresso?', answer: 'Pela página do evento.' }] },
  final: { title: 'Pronto para começar?', cta: { label: 'Ver eventos', href: '/events' } },
};

/** The 12 sections of the v1 editor as v2 blocks, through the same upgrade that converts v1 pages. */
export const READY_BLOCKS: readonly { type: PageSectionType; element: PageElement }[] = PAGE_SECTION_TYPES.map((type) => {
  const section = createEmptySection(type, crypto.randomUUID()) as PageSection;
  const v1 = { ...section, props: { ...section.props, ...EXAMPLES[type] } } as PageSection;
  const { content } = upgradePageDocument({ schemaVersion: 1, context: { type: 'none' }, sections: [v1] });
  return { type, element: content[0] as PageElement };
});
