import { useEffect } from 'react';
import { createUsePuck } from '@puckeditor/core';
import type { Breakpoint, PageElement } from '@live-show/api-contracts';
import { withoutClashes } from './tree-ops';

export const usePuck = createUsePuck();

/** Applies `change` to the Puck content, as one undoable step. */
export type EditContent = (change: (content: PageElement[]) => PageElement[] | null) => void;

export function useEditContent(): EditContent {
  const dispatch = usePuck((s) => s.dispatch);
  return (change) => dispatch({
    type: 'setData',
    recordHistory: true,
    data: (previous) => ({ content: change(previous.content as unknown as PageElement[]) ?? previous.content }) as never,
  });
}

/**
 * Puck's duplicate copies anchors and h1, which the draft validator refuses. Puck gives no hook to change the action itself, so
 * `onAction` hands over here and the copy is cleaned as the next step. Render inside <Puck>; call `.current` from `onAction`.
 */
export function DuplicateCleaner({ cleanRef }: { cleanRef: { current: (() => void) | null } }) {
  const dispatch = usePuck((s) => s.dispatch);
  useEffect(() => {
    cleanRef.current = () => dispatch({
      type: 'setData',
      data: (previous) => ({ content: withoutClashes(previous.content as unknown as PageElement[]) }) as never,
    });
    return () => { cleanRef.current = null; };
  }, [dispatch, cleanRef]);
  return null;
}

export type { Breakpoint };
