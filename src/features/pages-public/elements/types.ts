import type { ComponentType, ReactNode } from 'react';
import type { ElementProps, ElementType, PublicPage } from '@live-show/api-contracts';

export interface RenderContext {
  /** Event data keyed by element id. */
  resolved: PublicPage['resolved'];
  /** `editor`: data widgets draw a placeholder when they have no data; `public`: they render nothing. */
  mode: 'public' | 'editor';
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
