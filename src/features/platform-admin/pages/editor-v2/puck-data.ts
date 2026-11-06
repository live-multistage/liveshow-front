import type { Data } from '@puckeditor/core';
import { mapElements, type PageDocumentV2, type PageElement } from '@live-show/api-contracts';

// Puck names the nodes it creates `<type>-<uuid>`; the contract wants the bare uuid (the prefix carries no information).
const PUCK_ID_PREFIX = /^[A-Za-z]+-(?=[0-9a-f]{8}-[0-9a-f]{4}-)/;

/** Contract id of a Puck node id (`heading-<uuid>` -> `<uuid>`). */
export const toContractId = (id: string): string => id.replace(PUCK_ID_PREFIX, '');

const cleanId = (element: PageElement): PageElement => {
  const props = element.props as { id?: string };
  if (typeof props.id !== 'string') return element;
  return { ...element, props: { ...props, id: toContractId(props.id) } } as PageElement;
};

/** The document is the Puck `Data` minus the fields Puck does not know (`schemaVersion`, `context`). */
export const toPuckData = (doc: PageDocumentV2): Data => ({ root: { props: {} }, content: doc.content as unknown as Data['content'] });

export function fromPuckData(data: Data, context: PageDocumentV2['context'] = { type: 'none' }): PageDocumentV2 {
  return {
    schemaVersion: 2,
    context,
    root: { props: {} },
    content: mapElements(data.content as unknown as PageElement[], cleanId) as PageDocumentV2['content'],
  };
}
