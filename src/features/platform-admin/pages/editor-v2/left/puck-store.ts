import { createUsePuck } from '@puckeditor/core';
import type { Breakpoint, PageElement } from '@live-show/api-contracts';

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

export type { Breakpoint };
