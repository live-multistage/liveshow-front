import { describe, expect, it } from 'vitest';
import { upgradePageDocument, walkElements, type PageDocumentV2 } from '@live-show/api-contracts';
import fixture from '../../../../../shared/api-contracts/src/pages/page-tree-fixture.json';
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

  it('tolerates an element without id (Puck mid-insert)', () => {
    const data = structuredClone(toPuckData(doc));
    delete (data.content[0].props as { id?: string }).id;
    expect(() => fromPuckData(data)).not.toThrow();
  });

  it('drops anything else Puck puts on the root', () => {
    const data = { ...toPuckData(doc), root: { props: { title: 'x' } } };
    expect(fromPuckData(data).root).toEqual({ props: {} });
  });

  it('strips Puck id prefixes on every element of the 19-type fixture and leaves iconList/faq items alone', () => {
    const full = fixture as unknown as PageDocumentV2;
    const ids: string[] = [];
    walkElements(full, (el) => void ids.push((el.props as { id: string }).id));
    const prefixed = ids.reduce((json, id) => json.replaceAll(id, `x-${id}`), JSON.stringify(toPuckData(full)));
    expect(fromPuckData(JSON.parse(prefixed), full.context)).toEqual(full);
  });
});
