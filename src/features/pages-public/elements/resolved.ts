import type { PageDocumentV2, PageElement } from '@live-show/api-contracts';

export function childrenOf(el: PageElement): PageElement[] | undefined {
  return el.type === 'section' || el.type === 'columns' || el.type === 'column' || el.type === 'group' ? el.props.items : undefined;
}

export function* walkElements(elements: PageElement[] | undefined): Generator<PageElement> {
  for (const el of elements ?? []) {
    yield el;
    yield* walkElements(childrenOf(el));
  }
}

/** True when some heading is an h1 (the v1 upgrade makes the first hero title one). */
export const hasH1 = (doc: PageDocumentV2) =>
  doc.content.some((section) => [section, ...walkElements(childrenOf(section))].some((el) => el.type === 'heading' && el.props.tag === 'h1'));
