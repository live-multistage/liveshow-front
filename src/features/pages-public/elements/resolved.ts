import { walkElements, type PageDocumentV2 } from '@live-show/api-contracts';

/** True when some heading is an h1 (the v1 upgrade makes the first hero title one). */
export const hasH1 = (doc: PageDocumentV2) => {
  let found = false;
  walkElements(doc, (el) => { if (el.type === 'heading' && el.props.tag === 'h1') found = true; });
  return found;
};
