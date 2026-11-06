import { describe, expect, it } from 'vitest';
import profileCases from './page-profile-cases.json';
import { PAGE_EDITOR_PROFILES, profileNameOf, validatePageAgainstProfile, validatePageAgainstProfileConfig, type PageEditorProfileName } from './profiles';
import type { PageDocumentV2 } from './document-v2';

const U = (n: number) => `${String(n).padStart(8, '0')}-4444-4444-8444-444444444444`;
const el = (n: number, type: string, props: Record<string, unknown> = {}) => ({ type, props: { id: U(n), ...props } });
const section = (n: number, items: unknown[] = [], props: Record<string, unknown> = {}) => el(n, 'section', { items, ...props });
const doc = (...content: unknown[]) => ({ schemaVersion: 2, context: { type: 'none' }, root: { props: {} }, content }) as unknown as PageDocumentV2;
const run = (d: PageDocumentV2, profile: PageEditorProfileName, org?: string) => validatePageAgainstProfile(d, profile, org);
const OWN = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const style = (desktop: Record<string, unknown>) => ({ style: { desktop } });

describe('validatePageAgainstProfile', () => {
  it('accepts a plain page on both profiles', () => {
    const d = doc(section(1, [el(2, 'heading', { text: 'Oi', tag: 'h2' })]));
    expect(run(d, 'platform')).toEqual([]);
    expect(run(d, 'organization', OWN)).toEqual([]);
  });

  it('maps owner to profile', () => {
    expect(profileNameOf({ kind: 'platform' })).toBe('platform');
    expect(profileNameOf({ kind: 'organization', organizationId: OWN })).toBe('organization');
  });

  it('refuses gradients and shadows only for organizations, with path and element id', () => {
    const d = doc(section(1, [], style({ bg: { kind: 'gradient', token: 'glow' }, shadow: 'glow' })));
    expect(run(d, 'platform')).toEqual([]);
    expect(run(d, 'organization', OWN)).toEqual([
      { path: 'content[0].props.style.desktop.shadow', segments: ['content', 0, 'props', 'style', 'desktop', 'shadow'], elementId: U(1), message: 'Sombras não são permitidas neste tipo de página.' },
      { path: 'content[0].props.style.desktop.bg', segments: ['content', 0, 'props', 'style', 'desktop', 'bg'], elementId: U(1), message: 'Gradientes não são permitidos neste tipo de página.' },
    ]);
  });

  it('accepts shadow none and background color/image for organizations', () => {
    const d = doc(section(1, [], style({ shadow: 'none', bg: { kind: 'image', url: 'https://x.io/a.png', scrim: 'default' } })), section(2, [], style({ bg: { kind: 'color', token: 'accent' } })));
    expect(run(d, 'organization', OWN)).toEqual([]);
  });

  it('checks every breakpoint', () => {
    const d = doc(section(1, [], { style: { desktop: {}, mobile: { shadow: 'card' } } }));
    expect(run(d, 'organization', OWN).map((i) => i.path)).toEqual(['content[0].props.style.mobile.shadow']);
  });

  it('refuses element types outside the profile', () => {
    const noVideo = { ...PAGE_EDITOR_PROFILES.organization, elementTypes: PAGE_EDITOR_PROFILES.organization.elementTypes.filter((t) => t !== 'video') };
    const d = doc(section(1, [el(2, 'video', { url: 'https://youtu.be/x' })]));
    expect(validatePageAgainstProfileConfig(d, noVideo, OWN)).toEqual([
      { path: 'content[0].props.items[0].type', segments: ['content', 0, 'props', 'items', 0, 'type'], elementId: U(2), message: '"video" não é permitido neste tipo de página.' },
    ]);
    expect(run(d, 'platform')).toEqual([]);
  });

  it('enforces maxDepth per profile', () => {
    // section(1) > columns(2) > column(3) > group(4) is fine; org limit is 5 levels, platform 6.
    const deep = (levels: number): unknown => {
      let node: unknown = el(100, 'heading', { text: 'x', tag: 'h2' });
      const chain = ['group', 'column', 'columns'];
      for (let i = 0; i < levels - 2; i++) node = el(10 + i, chain[i % 3]!, { items: [node] });
      return section(1, [node]);
    };
    // heading sits at depth `levels`
    expect(run(doc(deep(5)), 'organization', OWN)).toEqual([]);
    expect(run(doc(deep(6)), 'organization', OWN).map((i) => i.message)).toEqual(['Profundidade máxima de 5 níveis.']);
    expect(run(doc(deep(6)), 'platform')).toEqual([]);
    expect(run(doc(deep(7)), 'platform').map((i) => i.message)).toEqual(['Profundidade máxima de 6 níveis.']);
  });

  it('enforces maxElements per profile', () => {
    const many = (n: number) => doc(section(1, Array.from({ length: n - 1 }, (_, i) => el(1000 + i, 'divider'))));
    expect(run(many(200), 'organization', OWN)).toEqual([]);
    expect(run(many(201), 'organization', OWN)).toEqual([{ path: '', segments: [], message: 'Máximo de 200 elementos neste tipo de página.' }]);
    expect(run(many(201), 'platform')).toEqual([]);
  });

  it('refuses locked (v2 never accepts it), with a profile-specific message', () => {
    const d = doc(section(1, [], { locked: true }));
    expect(run(d, 'organization', OWN).map((i) => i.message)).toEqual(['Esta página não pode bloquear elementos.']);
    expect(run(d, 'platform').map((i) => i.message)).toEqual(['Bloqueio de elemento ainda não é suportado.']);
  });

  describe('dataScope ownOrganization', () => {
    const rail = (source: unknown) => doc(section(1, [el(2, 'eventRail', { title: 'Eventos', source, limit: 4 })]));
    it('accepts own organization, category, artist and live rails', () => {
      for (const source of [{ kind: 'organization', id: OWN }, { kind: 'category', id: 'musica' }, { kind: 'artist', id: 'a' }, { kind: 'live' }]) {
        expect(run(rail(source), 'organization', OWN)).toEqual([]);
      }
    });
    it('refuses another organization, or any organization when the owner is unknown', () => {
      const issue = [{ path: 'content[0].props.items[0].props.source', segments: ['content', 0, 'props', 'items', 0, 'props', 'source'], elementId: U(2), message: 'A faixa só pode mostrar eventos da sua organização.' }];
      expect(run(rail({ kind: 'organization', id: OTHER }), 'organization', OWN)).toEqual(issue);
      expect(run(rail({ kind: 'organization', id: OWN }), 'organization')).toEqual(issue);
    });
    it('platform may show any organization', () => {
      expect(run(rail({ kind: 'organization', id: OTHER }), 'platform')).toEqual([]);
    });
    it('does not judge featuredEvent (only the back can load the event)', () => {
      const d = doc(section(1, [el(2, 'featuredEvent', { eventId: OTHER })]));
      expect(run(d, 'organization', OWN)).toEqual([]);
    });
  });
});

// Identical file (cmp) is consumed by the orchestrator mirror validator.
const CASES = profileCases as Array<{ name: string; profile: PageEditorProfileName; ownerOrganizationId?: string; input: PageDocumentV2; valid: boolean }>;
describe('page-profile-cases', () => {
  it('covers valid and invalid cases for both profiles', () => {
    expect(CASES.some((c) => c.valid)).toBe(true);
    expect(CASES.some((c) => !c.valid)).toBe(true);
    expect(new Set(CASES.map((c) => c.profile))).toEqual(new Set(['platform', 'organization']));
  });
  it.each(CASES)('$name', ({ input, profile, ownerOrganizationId, valid }) => {
    expect(validatePageAgainstProfile(input, profile, ownerOrganizationId).length === 0).toBe(valid);
  });
});
