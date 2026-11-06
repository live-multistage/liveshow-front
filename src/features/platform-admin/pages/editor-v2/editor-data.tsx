'use client';

import { createContext, useContext } from 'react';
import type { PageResolvedData } from '@live-show/api-contracts';
import type { EditorLabels } from '@/features/pages-public/elements/types';

export interface EditorData {
  /** Event data by Puck id: saved preview plus what `useResolveData` fetched for unsaved elements. */
  resolved: PageResolvedData;
  loading: readonly string[];
  labels?: EditorLabels;
}

export const NO_EDITOR_DATA: EditorData = { resolved: { rails: {}, featured: {}, live: {} }, loading: [] };

const EditorDataContext = createContext<EditorData>(NO_EDITOR_DATA);
export const EditorDataProvider = EditorDataContext.Provider;
/** What the inspector says about the data elements ("no events for this filter", "event unavailable"). */
export const useEditorData = () => useContext(EditorDataContext);
