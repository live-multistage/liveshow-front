import { describe, expect, it } from 'vitest';
import {
  PAGE_LIMITS,
  createEmptySection,
  type PageDocument,
  type PageSection,
  type PageSectionType,
} from '@live-show/api-contracts';
import {
  countInvalidFields,
  createEditorState,
  pageEditorReducer,
  selectInvalidSections,
  type PageEditorAction,
  type PageEditorState,
} from './page-editor-reducer';

const doc = (...sections: PageSection[]): PageDocument => ({
  schemaVersion: 1,
  context: { type: 'none' },
  sections,
});

const sectionOf = (type: PageSectionType, id: string): PageSection => createEmptySection(type, id);

const validText = (id: string): PageSection => ({
  ...createEmptySection('text', id),
  props: { paragraphs: [[{ text: 'Olá' }]] },
});

const stateWith = (...sections: PageSection[]): PageEditorState => createEditorState(doc(...sections));

const idsOf = (state: PageEditorState) => state.document.sections.map((s) => s.id);

const reduce = (state: PageEditorState, action: PageEditorAction) => pageEditorReducer(state, action);

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('createEditorState', () => {
  it('starts clean, unlocked and without selection', () => {
    const state = createEditorState(doc(sectionOf('hero', 'a')));

    expect(state).toEqual({
      document: doc(sectionOf('hero', 'a')),
      selectedId: null,
      lastRemoved: null,
      dirty: false,
      locked: false,
    });
  });
});

describe('add', () => {
  it('appends an empty section at the end, selects it and marks dirty', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    const next = reduce(state, { type: 'add', sectionType: 'faq', id: 'b' });

    expect(idsOf(next)).toEqual(['a', 'b']);
    expect(next.document.sections[1]).toEqual(createEmptySection('faq', 'b'));
    expect(next.selectedId).toBe('b');
    expect(next.dirty).toBe(true);
  });

  it('inserts at the given index', () => {
    const state = stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b'));

    const next = reduce(state, { type: 'add', sectionType: 'text', index: 1, id: 'c' });

    expect(idsOf(next)).toEqual(['a', 'c', 'b']);
  });

  it('clamps an index beyond the end to the end', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    const next = reduce(state, { type: 'add', sectionType: 'text', index: 99, id: 'b' });

    expect(idsOf(next)).toEqual(['a', 'b']);
  });

  it('is a no-op at the section limit', () => {
    const full = stateWith(...Array.from({ length: PAGE_LIMITS.maxSections }, (_, i) => sectionOf('text', `s${i}`)));

    expect(reduce(full, { type: 'add', sectionType: 'text', id: 'extra' })).toBe(full);
  });

  it('clears lastRemoved when it changes the document', () => {
    const removed = reduce(stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b')), { type: 'remove', id: 'a' });

    const next = reduce(removed, { type: 'add', sectionType: 'text', id: 'c' });

    expect(next.lastRemoved).toBeNull();
  });
});

describe('duplicate', () => {
  it('inserts a deep copy right below the original and selects the copy', () => {
    const original = { ...createEmptySection('pricing', 'a'), props: { title: 'Planos', plans: [{ name: 'A', price: '1' }, { name: 'B', price: '2' }] } } as PageSection;
    const state = stateWith(original, sectionOf('final', 'b'));

    const next = reduce(state, { type: 'duplicate', id: 'a', newId: 'c' });

    expect(idsOf(next)).toEqual(['a', 'c', 'b']);
    expect(next.document.sections[1]).toEqual({ ...original, id: 'c' });
    expect(next.document.sections[1].props).not.toBe(original.props);
    expect(next.selectedId).toBe('c');
    expect(next.dirty).toBe(true);
  });

  it('is a no-op for an unknown id', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    expect(reduce(state, { type: 'duplicate', id: 'zzz', newId: 'c' })).toBe(state);
  });

  it('is a no-op at the section limit', () => {
    const full = stateWith(...Array.from({ length: PAGE_LIMITS.maxSections }, (_, i) => sectionOf('text', `s${i}`)));

    expect(reduce(full, { type: 'duplicate', id: 's0', newId: 'extra' })).toBe(full);
  });
});

describe('remove', () => {
  it('removes the section and remembers it with its index', () => {
    const state = stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b'), sectionOf('faq', 'c'));

    const next = reduce(state, { type: 'remove', id: 'b' });

    expect(idsOf(next)).toEqual(['a', 'c']);
    expect(next.lastRemoved).toEqual({ section: sectionOf('final', 'b'), index: 1 });
    expect(next.dirty).toBe(true);
  });

  it('clears the selection when the selected section is removed', () => {
    const state = { ...stateWith(sectionOf('hero', 'a')), selectedId: 'a' };

    expect(reduce(state, { type: 'remove', id: 'a' }).selectedId).toBeNull();
  });

  it('keeps the selection when another section is removed', () => {
    const state = { ...stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b')), selectedId: 'a' };

    expect(reduce(state, { type: 'remove', id: 'b' }).selectedId).toBe('a');
  });

  it('is a no-op for an unknown id', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    expect(reduce(state, { type: 'remove', id: 'zzz' })).toBe(state);
  });
});

describe('undoRemove', () => {
  it('reinserts the removed section at its original index and selects it', () => {
    const removed = reduce(stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b'), sectionOf('faq', 'c')), { type: 'remove', id: 'b' });

    const next = reduce(removed, { type: 'undoRemove' });

    expect(idsOf(next)).toEqual(['a', 'b', 'c']);
    expect(next.selectedId).toBe('b');
    expect(next.lastRemoved).toBeNull();
    expect(next.dirty).toBe(true);
  });

  it('is a no-op when nothing was removed', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    expect(reduce(state, { type: 'undoRemove' })).toBe(state);
  });

  it('is a no-op at the section limit', () => {
    const base = stateWith(...Array.from({ length: PAGE_LIMITS.maxSections }, (_, i) => sectionOf('text', `s${i}`)));
    const state = { ...base, lastRemoved: { section: sectionOf('hero', 'gone'), index: 0 } };

    expect(reduce(state, { type: 'undoRemove' })).toBe(state);
  });
});

describe('move', () => {
  it('moves the section to the target index', () => {
    const state = stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b'), sectionOf('faq', 'c'));

    expect(idsOf(reduce(state, { type: 'move', id: 'a', to: 2 }))).toEqual(['b', 'c', 'a']);
  });

  it('clamps the target index into range', () => {
    const state = stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b'));

    expect(idsOf(reduce(state, { type: 'move', id: 'a', to: -5 }))).toEqual(['a', 'b']);
    expect(idsOf(reduce(state, { type: 'move', id: 'a', to: 50 }))).toEqual(['b', 'a']);
  });

  it('is a no-op when the section already sits at the target index', () => {
    const state = stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b'));

    expect(reduce(state, { type: 'move', id: 'a', to: 0 })).toBe(state);
  });

  it('is a no-op for an unknown id', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    expect(reduce(state, { type: 'move', id: 'zzz', to: 0 })).toBe(state);
  });
});

describe('moveBy', () => {
  it('moves one position up or down', () => {
    const state = stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b'), sectionOf('faq', 'c'));

    expect(idsOf(reduce(state, { type: 'moveBy', id: 'b', delta: -1 }))).toEqual(['b', 'a', 'c']);
    expect(idsOf(reduce(state, { type: 'moveBy', id: 'b', delta: 1 }))).toEqual(['a', 'c', 'b']);
  });

  it('is a no-op at the top moving up and at the bottom moving down', () => {
    const state = stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b'));

    expect(reduce(state, { type: 'moveBy', id: 'a', delta: -1 })).toBe(state);
    expect(reduce(state, { type: 'moveBy', id: 'b', delta: 1 })).toBe(state);
  });
});

describe('toggleHidden', () => {
  it('flips the hidden flag and marks dirty', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    const hidden = reduce(state, { type: 'toggleHidden', id: 'a' });
    const shown = reduce(hidden, { type: 'toggleHidden', id: 'a' });

    expect(hidden.document.sections[0].hidden).toBe(true);
    expect(hidden.dirty).toBe(true);
    expect(shown.document.sections[0].hidden).toBe(false);
  });

  it('is a no-op for an unknown id', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    expect(reduce(state, { type: 'toggleHidden', id: 'zzz' })).toBe(state);
  });
});

describe('updateProps', () => {
  it('shallow-merges the props into the section', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    const next = reduce(state, { type: 'updateProps', id: 'a', props: { title: 'Olá', subtitle: 'Mundo' } });

    expect(next.document.sections[0].props).toEqual({ title: 'Olá', subtitle: 'Mundo' });
    expect(next.dirty).toBe(true);
  });

  it('removes source.id when a rail section switches to live', () => {
    const rail: PageSection = {
      ...createEmptySection('rail', 'r'),
      props: { title: 'Ao vivo', source: { kind: 'category', id: 'cat-1' }, limit: 8 },
    };
    const state = stateWith(rail);

    const next = reduce(state, { type: 'updateProps', id: 'r', props: { source: { kind: 'live' } } });
    const source = (next.document.sections[0] as Extract<PageSection, { type: 'rail' }>).props.source;

    expect(source).toEqual({ kind: 'live' });
    expect(source).not.toHaveProperty('id');
  });

  it('keeps source.id for non-live rail sources', () => {
    const rail: PageSection = {
      ...createEmptySection('rail', 'r'),
      props: { title: 'Ao vivo', source: { kind: 'live' }, limit: 8 },
    };
    const state = stateWith(rail);

    const next = reduce(state, { type: 'updateProps', id: 'r', props: { source: { kind: 'artist', id: 'art-1' } } });

    expect((next.document.sections[0] as Extract<PageSection, { type: 'rail' }>).props.source).toEqual({ kind: 'artist', id: 'art-1' });
  });

  it('is a no-op for an unknown id', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    expect(reduce(state, { type: 'updateProps', id: 'zzz', props: { title: 'x' } })).toBe(state);
  });
});

describe('updateAppearance', () => {
  it('merges the given appearance fields and marks dirty', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    const next = reduce(state, { type: 'updateAppearance', id: 'a', appearance: { background: 'accent', showOn: 'mobile' } });

    expect(next.document.sections[0].appearance).toEqual({ background: 'accent', spacing: 'normal', showOn: 'mobile' });
    expect(next.dirty).toBe(true);
  });
});

describe('select', () => {
  it('sets the selection without touching the document or dirty flag', () => {
    const state = stateWith(sectionOf('hero', 'a'));

    const next = reduce(state, { type: 'select', id: 'a' });

    expect(next.selectedId).toBe('a');
    expect(next.document).toBe(state.document);
    expect(next.dirty).toBe(false);
  });
});

describe('markSaved', () => {
  it('clears dirty and keeps the document', () => {
    const dirty = reduce(stateWith(sectionOf('hero', 'a')), { type: 'toggleHidden', id: 'a' });

    const next = reduce(dirty, { type: 'markSaved' });

    expect(next.dirty).toBe(false);
    expect(next.document).toBe(dirty.document);
  });
});

describe('load', () => {
  it('replaces the document and resets selection, removal, dirty and lock', () => {
    const busy: PageEditorState = {
      ...stateWith(sectionOf('hero', 'a')),
      selectedId: 'a',
      lastRemoved: { section: sectionOf('final', 'b'), index: 0 },
      dirty: true,
      locked: true,
    };

    const next = reduce(busy, { type: 'load', document: doc(sectionOf('faq', 'c')) });

    expect(next).toEqual(createEditorState(doc(sectionOf('faq', 'c'))));
  });
});

describe('locked', () => {
  const mutatingActions: PageEditorAction[] = [
    { type: 'add', sectionType: 'text', id: 'new' },
    { type: 'duplicate', id: 'a', newId: 'new' },
    { type: 'remove', id: 'a' },
    { type: 'undoRemove' },
    { type: 'move', id: 'a', to: 1 },
    { type: 'moveBy', id: 'a', delta: 1 },
    { type: 'toggleHidden', id: 'a' },
    { type: 'updateProps', id: 'a', props: { title: 'x' } },
    { type: 'updateAppearance', id: 'a', appearance: { background: 'accent' } },
  ];

  it.each(mutatingActions)('ignores $type', (action) => {
    const state: PageEditorState = { ...stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b')), lastRemoved: { section: sectionOf('faq', 'c'), index: 0 }, locked: true };

    expect(reduce(state, action)).toBe(state);
  });

  it('still allows select, markSaved and lock', () => {
    const state: PageEditorState = { ...stateWith(sectionOf('hero', 'a')), locked: true };

    expect(reduce(state, { type: 'select', id: 'a' }).selectedId).toBe('a');
    expect(reduce(state, { type: 'markSaved' }).dirty).toBe(false);
    expect(reduce(stateWith(sectionOf('hero', 'a')), { type: 'lock' }).locked).toBe(true);
  });
});

describe('immutability', () => {
  it('never mutates a frozen state or document', () => {
    const base = stateWith(sectionOf('hero', 'a'), sectionOf('final', 'b'), sectionOf('rail', 'r'));
    const frozen = deepFreeze({ ...base, selectedId: 'a' });
    const actions: PageEditorAction[] = [
      { type: 'add', sectionType: 'faq', id: 'n' },
      { type: 'duplicate', id: 'a', newId: 'n' },
      { type: 'remove', id: 'a' },
      { type: 'move', id: 'a', to: 2 },
      { type: 'moveBy', id: 'b', delta: -1 },
      { type: 'toggleHidden', id: 'a' },
      { type: 'updateProps', id: 'r', props: { source: { kind: 'live' } } },
      { type: 'updateAppearance', id: 'a', appearance: { spacing: 'wide' } },
      { type: 'select', id: 'b' },
      { type: 'markSaved' },
      { type: 'lock' },
    ];
    const snapshot = JSON.stringify(frozen);

    actions.forEach((action) => {
      expect(() => reduce(frozen, action)).not.toThrow();
    });

    expect(JSON.stringify(frozen)).toBe(snapshot);
  });
});

describe('selectInvalidSections', () => {
  it('returns only sections with issues, keyed by id', () => {
    const document = doc(sectionOf('hero', 'a'), validText('b'));

    const invalid = selectInvalidSections(document);

    expect(Object.keys(invalid)).toEqual(['a']);
    expect(invalid.a).toContainEqual(expect.objectContaining({ path: 'title' }));
  });

  it('returns an empty record for a valid document', () => {
    expect(selectInvalidSections(doc(validText('b')))).toEqual({});
  });
});

describe('countInvalidFields', () => {
  it('counts distinct invalid field paths across sections', () => {
    expect(countInvalidFields(doc(sectionOf('hero', 'a')))).toBe(1);
    expect(countInvalidFields(doc(sectionOf('hero', 'a'), sectionOf('media', 'm')))).toBe(3);
  });

  it('is zero for a valid document', () => {
    expect(countInvalidFields(doc(validText('b')))).toBe(0);
  });
});
