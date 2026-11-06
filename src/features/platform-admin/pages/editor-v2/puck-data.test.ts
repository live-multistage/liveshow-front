import { describe, expect, it } from 'vitest';
import { upgradePageDocument, type PageDocumentV2 } from '@live-show/api-contracts';
import { fromPuckData, toPuckData } from './puck-data';

const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const doc: PageDocumentV2 = {
  schemaVersion: 2,
  context: { type: 'none' },
  root: { props: {} },
  content: [{
    type: 'section',
    props: {
      id: UUID(1),
      items: [
        { type: 'heading', props: { id: UUID(2), text: 'Olá', tag: 'h1' } },
        { type: 'columns', props: { id: UUID(3), items: [{ type: 'column', props: { id: UUID(4), items: [] } }] } },
      ],
    },
  }],
};

describe('puck adapter', () => {
  it('round-trips a document unchanged', () => {
    expect(fromPuckData(toPuckData(doc))).toEqual(doc);
  });

  it('round-trips a converted v1 document', () => {
    const upgraded = upgradePageDocument({ schemaVersion: 1, context: { type: 'none' }, sections: [] });
    expect(fromPuckData(toPuckData(upgraded))).toEqual(upgraded);
  });

  it('hands Puck only root and content', () => {
    expect(Object.keys(toPuckData(doc)).sort()).toEqual(['content', 'root']);
  });

  it('turns Puck ids (type-uuid) back into the uuid the contract requires, at any depth', () => {
    const data = toPuckData(doc);
    const prefixed = JSON.parse(JSON.stringify(data).replaceAll(UUID(2), `heading-${UUID(2)}`).replaceAll(UUID(4), `column-${UUID(4)}`));
    expect(fromPuckData(prefixed)).toEqual(doc);
  });

  it('drops anything else Puck puts on the root', () => {
    const data = { ...toPuckData(doc), root: { props: { title: 'x' } } };
    expect(fromPuckData(data).root).toEqual({ props: {} });
  });
});
