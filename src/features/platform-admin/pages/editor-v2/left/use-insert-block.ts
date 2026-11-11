import type { PageElement } from '@live-show/api-contracts';
import { useEditContent, usePuck } from './puck-store';
import { canNest, cloneWithNewIds, insertAt, insertionPoint, type InsertionPoint } from './tree-ops';

/** Selects, in Puck, the element that now sits at `at`. */
export function useSelectAt() {
  const dispatch = usePuck((s) => s.dispatch);
  return (at: InsertionPoint) => dispatch({ type: 'setUi', ui: { itemSelector: { index: at.index, zone: at.zone } } });
}

/** Inserts a copy (new ids) of a block at the insertion point of the current selection, and selects it. */
export function useInsertBlock() {
  const content = usePuck((s) => s.appState.data.content) as unknown as PageElement[];
  const selectedId = usePuck((s) => (s.selectedItem?.props as { id?: string } | undefined)?.id ?? null);
  const edit = useEditContent();
  const selectAt = useSelectAt();
  return (element: PageElement) => {
    const at = insertionPoint(content, selectedId, element.type);
    if (!canNest(at.parentType, element.type)) return;
    edit((current) => insertAt(current, at.parentId, at.index, cloneWithNewIds(element)));
    selectAt(at);
  };
}
