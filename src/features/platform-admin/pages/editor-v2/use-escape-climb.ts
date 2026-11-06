'use client';

import { useEffect, useRef } from 'react';
import { usePuck } from './left/puck-store';

const EDITABLE = 'input, textarea, select, [contenteditable="true"]';

/**
 * Esc climbs the selection to the parent (the page for a top-level element). Typing in a field, Esc first leaves the field.
 * Open dialogs and drawers own Esc: they close themselves and the selection stays.
 */
export function useEscapeClimb() {
  const selectedId = usePuck((s) => (s.selectedItem?.props as { id?: string } | undefined)?.id ?? null);
  const dispatch = usePuck((s) => s.dispatch);
  const getParentById = usePuck((s) => s.getParentById);
  const getSelectorForId = usePuck((s) => s.getSelectorForId);
  const latest = useRef({ selectedId, dispatch, getParentById, getSelectorForId });
  latest.current = { selectedId, dispatch, getParentById, getSelectorForId };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const { selectedId: id, dispatch: send, getParentById: parentOf, getSelectorForId: selectorOf } = latest.current;
      if (!id || document.querySelector('[role="dialog"]')) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(EDITABLE)) return void (target as HTMLElement).blur();
      const parent = parentOf(id);
      const parentId = parent && parent.type !== 'root' ? String((parent.props as { id?: string }).id) : null;
      send({ type: 'setUi', ui: { itemSelector: parentId ? selectorOf(parentId) ?? null : null } });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
