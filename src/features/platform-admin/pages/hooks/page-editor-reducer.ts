import {
  PAGE_LIMITS,
  createEmptySection,
  pageSectionIssues,
  type PageDocument,
  type PageSection,
  type PageSectionAppearance,
  type PageSectionType,
} from '@live-show/api-contracts';

export interface PageEditorState {
  document: PageDocument;
  selectedId: string | null;
  lastRemoved: { section: PageSection; index: number } | null;
  dirty: boolean;
  locked: boolean;
}

export type PageEditorAction =
  | { type: 'load'; document: PageDocument }
  | { type: 'add'; sectionType: PageSectionType; index?: number; id: string }
  | { type: 'duplicate'; id: string; newId: string }
  | { type: 'remove'; id: string }
  | { type: 'undoRemove' }
  | { type: 'move'; id: string; to: number }
  | { type: 'moveBy'; id: string; delta: -1 | 1 }
  | { type: 'toggleHidden'; id: string }
  | { type: 'updateProps'; id: string; props: Record<string, unknown> }
  | { type: 'updateAppearance'; id: string; appearance: Partial<PageSectionAppearance> }
  | { type: 'select'; id: string | null }
  | { type: 'markSaved'; document: PageDocument }
  | { type: 'lock' };

export type SectionIssue = { path: string; message: string };

const DOCUMENT_ACTIONS: ReadonlySet<PageEditorAction['type']> = new Set([
  'add',
  'duplicate',
  'remove',
  'undoRemove',
  'move',
  'moveBy',
  'toggleHidden',
  'updateProps',
  'updateAppearance',
]);

export function createEditorState(document: PageDocument): PageEditorState {
  return { document, selectedId: null, lastRemoved: null, dirty: false, locked: false };
}

export function pageEditorReducer(state: PageEditorState, action: PageEditorAction): PageEditorState {
  if (state.locked && DOCUMENT_ACTIONS.has(action.type)) return state;

  switch (action.type) {
    case 'load':
      return createEditorState(action.document);
    case 'add':
      return addSection(state, action.sectionType, action.id, action.index);
    case 'duplicate':
      return duplicateSection(state, action.id, action.newId);
    case 'remove':
      return removeSection(state, action.id);
    case 'undoRemove':
      return undoRemove(state);
    case 'move':
      return moveSection(state, action.id, action.to);
    case 'moveBy': {
      const from = indexOfSection(state, action.id);
      return from === -1 ? state : moveSection(state, action.id, from + action.delta);
    }
    case 'toggleHidden':
      return mapSection(state, action.id, (section) => ({ ...section, hidden: !section.hidden }));
    case 'updateProps':
      return mapSection(state, action.id, (section) => ({ ...section, props: mergeProps(section, action.props) }) as PageSection);
    case 'updateAppearance':
      return mapSection(state, action.id, (section) => ({
        ...section,
        appearance: { ...section.appearance, ...action.appearance },
      }));
    case 'select':
      return { ...state, selectedId: action.id };
    case 'markSaved':
      // Only the document that was actually sent counts as saved; newer edits stay dirty.
      return { ...state, dirty: state.document === action.document ? false : state.dirty };
    case 'lock':
      return { ...state, locked: true };
  }
}

export function selectInvalidSections(document: PageDocument): Record<string, SectionIssue[]> {
  return Object.fromEntries(
    document.sections.flatMap((section) => {
      const issues = pageSectionIssues(section);
      return issues.length > 0 ? [[section.id, issues]] : [];
    }),
  );
}

export function countInvalidFields(document: PageDocument): number {
  return Object.values(selectInvalidSections(document)).reduce(
    (total, issues) => total + new Set(issues.map((issue) => issue.path)).size,
    0,
  );
}

function hasRoom(state: PageEditorState): boolean {
  return state.document.sections.length < PAGE_LIMITS.maxSections;
}

function indexOfSection(state: PageEditorState, id: string): number {
  return state.document.sections.findIndex((section) => section.id === id);
}

function withSections(state: PageEditorState, sections: PageSection[], patch: Partial<PageEditorState> = {}): PageEditorState {
  return {
    ...state,
    document: { ...state.document, sections },
    dirty: true,
    lastRemoved: null,
    ...patch,
  };
}

function mapSection(state: PageEditorState, id: string, update: (section: PageSection) => PageSection): PageEditorState {
  const index = indexOfSection(state, id);
  if (index === -1) return state;
  return withSections(
    state,
    state.document.sections.map((section, i) => (i === index ? update(section) : section)),
  );
}

function addSection(state: PageEditorState, sectionType: PageSectionType, id: string, index?: number): PageEditorState {
  if (!hasRoom(state)) return state;
  const { sections } = state.document;
  const at = clamp(index ?? sections.length, 0, sections.length);
  return withSections(state, insertAt(sections, at, createEmptySection(sectionType, id) as PageSection), { selectedId: id });
}

function duplicateSection(state: PageEditorState, id: string, newId: string): PageEditorState {
  const index = indexOfSection(state, id);
  if (index === -1 || !hasRoom(state)) return state;
  const copy = { ...structuredClone(state.document.sections[index]), id: newId } as PageSection;
  return withSections(state, insertAt(state.document.sections, index + 1, copy), { selectedId: newId });
}

function removeSection(state: PageEditorState, id: string): PageEditorState {
  const index = indexOfSection(state, id);
  if (index === -1) return state;
  return withSections(state, state.document.sections.filter((_, i) => i !== index), {
    lastRemoved: { section: state.document.sections[index], index },
    selectedId: state.selectedId === id ? null : state.selectedId,
  });
}

function undoRemove(state: PageEditorState): PageEditorState {
  if (!state.lastRemoved || !hasRoom(state)) return state;
  const { section, index } = state.lastRemoved;
  const { sections } = state.document;
  return withSections(state, insertAt(sections, clamp(index, 0, sections.length), section), { selectedId: section.id });
}

function moveSection(state: PageEditorState, id: string, to: number): PageEditorState {
  const from = indexOfSection(state, id);
  if (from === -1) return state;
  const target = clamp(to, 0, state.document.sections.length - 1);
  if (target === from) return state;
  const sections = [...state.document.sections];
  const [moved] = sections.splice(from, 1);
  sections.splice(target, 0, moved);
  return withSections(state, sections);
}

// Props are untyped at this boundary; pageSectionIssues validates them afterwards.
// A live rail has no source id; keeping a stale one would send a dangling reference on publish.
function mergeProps(section: PageSection, props: Record<string, unknown>): PageSection['props'] {
  const merged: Record<string, unknown> = { ...section.props, ...props };
  const source = merged.source as { kind?: unknown } | undefined;
  if (section.type !== 'rail' || source?.kind !== 'live') return merged as unknown as PageSection['props'];
  return { ...merged, source: { kind: 'live' } } as unknown as PageSection['props'];
}

function insertAt(sections: PageSection[], index: number, section: PageSection): PageSection[] {
  return [...sections.slice(0, index), section, ...sections.slice(index)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
