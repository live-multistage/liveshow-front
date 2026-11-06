'use client';

import type { ComponentConfig, Config, Field } from '@puckeditor/core';
import {
  ELEMENT_SLOT_RULES, ELEMENT_TYPES, type ElementProps, type ElementType, type PageElement,
} from '@live-show/api-contracts';
import { ElementRenderer, PageContainer } from '@/features/pages-public/elements';
import type { RenderContext } from '@/features/pages-public/elements';
import { renderField } from './fields-placeholder';

/** Content props of each type (SDD §2.2). The inspector (V2-U2) replaces the placeholder with real controls. */
const CONTENT_FIELDS: Record<ElementType, readonly string[]> = {
  section: [], columns: [], column: [], group: [], divider: [], spacer: [],
  heading: ['text', 'tag'], text: ['text'], label: ['text'], button: ['label', 'href', 'newTab'],
  image: ['url', 'alt'], video: ['url'], iconList: ['items'], counter: ['value', 'label'], faq: ['items'],
  plan: ['name', 'price', 'description', 'cta'], eventRail: ['source', 'limit'],
  featuredEvent: ['eventId', 'ctaLabel'], liveNow: ['limit', 'emptyText'],
};

const column = (): { type: string; props: Record<string, unknown> } => ({ type: 'column', props: { items: [] } });

// Puck assigns `props.id` itself on insert and duplicate (`<type>-<uuid>`); fromPuckData turns it into the contract uuid.
const DEFAULT_PROPS: Record<ElementType, Record<string, unknown>> = {
  section: { items: [] },
  // Two columns on desktop and tablet, stacked on the phone.
  columns: { items: [column(), column()], style: { desktop: { cols: 2 }, mobile: { cols: 1 } } },
  column: { items: [] },
  group: { items: [] },
  heading: { text: 'Título', tag: 'h2' },
  text: { text: 'Escreva aqui o texto do seu evento.' },
  label: { text: 'Selo' },
  button: { label: 'Saiba mais', href: '/events' },
  image: { url: '', alt: '' },
  video: { url: '' },
  divider: {},
  spacer: {},
  iconList: { items: ['Primeiro item', 'Segundo item'] },
  counter: { value: '10 mil', label: 'espectadores' },
  faq: { items: [{ question: 'Pergunta', answer: 'Resposta' }] },
  plan: { name: 'Plano', price: 'R$ 0' },
  eventRail: { source: { kind: 'live' }, limit: 4 },
  featuredEvent: { eventId: '' },
  liveNow: { limit: 4, emptyText: 'Nenhum evento ao vivo agora' },
};

const ROOT_ZONE = 'root:default-zone';

export interface PuckMetadata {
  resolved: RenderContext['resolved'];
}

function renderElement(type: ElementType) {
  const hasSlot = ELEMENT_SLOT_RULES[type] !== null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function Render(raw: any) {
    const { puck, items: Items, ...props } = raw as { puck: { metadata?: PuckMetadata }; items?: (opts?: object) => React.ReactNode } & Record<string, unknown>;
    const ctx: RenderContext = { resolved: puck.metadata?.resolved ?? { rails: {}, featured: {}, live: {} }, mode: 'editor' };
    const element = { type, props: props as unknown as ElementProps } as PageElement;
    return <ElementRenderer element={element} ctx={ctx} slot={hasSlot && Items ? <Items /> : undefined} />;
  };
}

function fieldsFor(type: ElementType): Record<string, Field> {
  const fields: Record<string, Field> = {};
  const allow = ELEMENT_SLOT_RULES[type];
  if (allow) fields.items = { type: 'slot', allow: [...allow] };
  for (const name of CONTENT_FIELDS[type]) fields[name] = { type: 'custom', render: renderField as never };
  return fields;
}

// The page root only takes sections (SDD §2.3); Puck's default root zone would take anything.
function RootRender({ puck }: { puck: { renderDropZone: (props: { zone: string; allow: string[] }) => React.ReactNode } }) {
  return <PageContainer>{puck.renderDropZone({ zone: ROOT_ZONE, allow: ['section'] })}</PageContainer>;
}

/** Generated from the contract: one entry per element type, nesting from the slot table, labels from the caller (i18n). */
export function createPuckConfig(label: (type: ElementType) => string): Config {
  const components = Object.fromEntries(
    ELEMENT_TYPES.map((type): [ElementType, ComponentConfig] => [type, {
      label: label(type),
      fields: fieldsFor(type),
      defaultProps: DEFAULT_PROPS[type],
      render: renderElement(type),
    } as ComponentConfig]),
  );
  return { components, root: { render: RootRender } } as unknown as Config;
}
