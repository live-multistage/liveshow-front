import type { Data } from '@puckeditor/core';
import { ELEMENT_SLOT_RULES, type ElementType, type PageDocumentV2, type PageElement } from '@live-show/api-contracts';

// Puck names the nodes it creates `<type>-<uuid>`; the contract wants the bare uuid (the prefix carries no information).
const PUCK_ID_PREFIX = /^[A-Za-z]+-(?=[0-9a-f]{8}-[0-9a-f]{4}-)/;

function cleanIds(element: PageElement): PageElement {
  const props = element.props as { id: string; items?: PageElement[] };
  const next = { ...props, id: props.id.replace(PUCK_ID_PREFIX, '') };
  // `items` of iconList and faq is content, not children.
  if (ELEMENT_SLOT_RULES[element.type] && props.items) next.items = props.items.map(cleanIds);
  return { type: element.type as ElementType, props: next } as PageElement;
}

/** The document is the Puck `Data` minus the fields Puck does not know (`schemaVersion`, `context`). */
export const toPuckData = (doc: PageDocumentV2): Data => ({ root: { props: {} }, content: doc.content as unknown as Data['content'] });

export function fromPuckData(data: Data, context: PageDocumentV2['context'] = { type: 'none' }): PageDocumentV2 {
  return {
    schemaVersion: 2,
    context,
    root: { props: {} },
    content: (data.content as unknown as PageElement[]).map(cleanIds) as PageDocumentV2['content'],
  };
}
