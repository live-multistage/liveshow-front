import type { ComponentType, ReactNode } from 'react';
import type { ElementProps, ElementType, PublicPage } from '@live-show/api-contracts';

/** Editor-only copy of the data elements (placeholders and notices). The editor fills it from `platformAdmin.pageEditorV2`; the public page never shows any of it. */
export interface EditorLabels {
  railPlaceholder: string;
  railNoneLive: string;
  railNoneCategory(category: string): string;
  railNoneFilter: string;
  railHidden: string;
  featuredPlaceholder: string;
  featuredUnavailable: string;
  featuredUnavailableText: string;
}

export const DEFAULT_EDITOR_LABELS: EditorLabels = {
  railPlaceholder: 'Trilho de eventos',
  railNoneLive: 'Nenhum evento ao vivo agora',
  railNoneCategory: (category) => `Nenhum evento para “${category}”`,
  railNoneFilter: 'Nenhum evento para este filtro',
  railHidden: 'Na página publicada este trilho fica oculto até haver eventos.',
  featuredPlaceholder: 'Evento em destaque',
  featuredUnavailable: 'Evento indisponível',
  featuredUnavailableText: 'Foi cancelado ou deixou de ser público. Na página publicada este bloco não aparece.',
};

export interface RenderContext {
  /** Event data keyed by element id. */
  resolved: PublicPage['resolved'];
  /** `editor`: data widgets draw a placeholder when they have no data; `public`: they render nothing. */
  mode: 'public' | 'editor';
  /** Editor only: data elements whose event data has not arrived yet (they draw a skeleton). An array, not a Set: Puck clones `metadata` and a Set does not survive it. */
  loading?: readonly string[];
  /** Editor only; falls back to the Portuguese defaults. */
  labels?: EditorLabels;
}

/** Attributes every element root receives from ElementRenderer: the anchor and the token classes. */
export interface ElementCommon {
  id?: string;
  className: string;
}

export interface ElementViewProps<T extends ElementType> {
  props: ElementProps<T>;
  common: ElementCommon;
  ctx: RenderContext;
  /** Rendered `items` of slot elements (section, columns, column, group). */
  children?: ReactNode;
  /** Image background layer for elements with `style.bg` (section, column, plan). */
  background?: ReactNode;
}

export type ElementView<T extends ElementType> = ComponentType<ElementViewProps<T>>;

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
