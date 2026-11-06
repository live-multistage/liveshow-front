import type { PageDocumentV2, PageElement, PublicPage } from '@live-show/api-contracts';

type Resolved = PublicPage['resolved'];

export function childrenOf(el: PageElement): PageElement[] | undefined {
  return el.type === 'section' || el.type === 'columns' || el.type === 'column' || el.type === 'group' ? el.props.items : undefined;
}

function* walk(elements: PageElement[] | undefined): Generator<PageElement> {
  for (const el of elements ?? []) {
    yield el;
    yield* walk(childrenOf(el));
  }
}

/**
 * Re-keys `resolved` by element id. Today the back keys rails/featured by v1 SECTION id; the section survives the v1 -> v2
 * upgrade, so the data of a section goes to the eventRail / featuredEvent / liveNow inside it. Entries already keyed by an
 * element id are kept.
 * TODO(V2-O3): the back will key by element id; drop the section fallback then.
 */
export function elementResolved(doc: PageDocumentV2, resolved: Resolved): Resolved {
  const rails = { ...resolved.rails };
  const featured = { ...resolved.featured };
  for (const section of doc.content) {
    const sid = section.props.id;
    for (const el of walk(childrenOf(section))) {
      const id = el.props.id;
      if ((el.type === 'eventRail' || el.type === 'liveNow') && !(id in rails) && sid in resolved.rails) rails[id] = resolved.rails[sid]!;
      if (el.type === 'featuredEvent' && !(id in featured) && sid in resolved.featured) featured[id] = resolved.featured[sid]!;
    }
  }
  return { rails, featured };
}
