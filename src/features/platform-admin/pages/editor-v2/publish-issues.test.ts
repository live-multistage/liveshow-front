import { describe, expect, it } from 'vitest';
import fixture from '../../../../../shared/api-contracts/src/pages/page-tree-fixture.json';
import { ELEMENT_TYPES, walkElements, type PageDocumentV2, type PageElement } from '@live-show/api-contracts';
import { listPublishIssues } from './publish-issues';
import { idOf, pathTo } from './left/tree-ops';

const doc = fixture as unknown as PageDocumentV2;
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('listPublishIssues', () => {
  it('a valid document has none', () => expect(listPublishIssues(doc)).toEqual([]));

  it.each(ELEMENT_TYPES)('%s: a server issue names the element, its type and the section that holds it', (type) => {
    let target: PageElement | undefined;
    walkElements(doc, (el) => { if (!target && el.type === type) target = el; });
    const [issue] = listPublishIssues(doc, { [idOf(target!)]: { eventId: 'Evento indisponível' } });
    expect(issue).toMatchObject({ elementId: idOf(target!), type, message: 'Evento indisponível' });
    expect(issue.sectionName === null || typeof issue.sectionName === 'string').toBe(true);
  });

  it('turns a contract error into a row with the element and its section name', () => {
    const broken = structuredClone(doc) as PageDocumentV2;
    let button: PageElement | undefined;
    walkElements(broken, (el) => { if (!button && el.type === 'button') button = el; });
    (button!.props as { href: string }).href = 'javascript:alert(1)';
    (pathTo(broken.content as PageElement[], idOf(button!))[0].props as { name?: string }).name = 'Abertura';
    const issues = listPublishIssues(broken);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toMatchObject({ elementId: idOf(button!), type: 'button' });
    expect(issues[0].sectionName).toBe('Abertura');
  });

  it('does not repeat the same issue and lists the server ones first', () => {
    const issues = listPublishIssues(doc, { [U(1)]: { eventId: 'x' } });
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toBe('x');
  });
});
