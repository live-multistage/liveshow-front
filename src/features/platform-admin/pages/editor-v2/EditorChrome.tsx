'use client';

import { useEffect, type ReactNode } from 'react';
import { createUsePuck, Puck } from '@puckeditor/core';
import type { Breakpoint, PageDetail } from '@live-show/api-contracts';
import type { AutosaveStatus } from '../hooks/use-draft-autosave';
import { EditorTopbar } from '../components/EditorTopbar';
import { CanvasStage } from './CanvasStage';
import { BREAKPOINT_WIDTH, breakpointFromWidth, useBreakpoint, useBreakpointSetter } from './use-breakpoint';
import styles from './PageEditorV2.module.scss';

const usePuck = createUsePuck();

// Puck binds undo/redo on the document; while locked they would move its tree away from the document we hold.
function useBlockHistoryKeys(blocked: boolean) {
  useEffect(() => {
    if (!blocked) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && ['z', 'y'].includes(event.key.toLowerCase())) event.stopImmediatePropagation();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [blocked]);
}

interface Props {
  page: PageDetail;
  saveStatus: AutosaveStatus;
  unpublished: boolean;
  publishBlock: string | null;
  historyDisabled: boolean;
  locked: boolean;
  onRetry(): void;
  onPublish(): void;
  onHistory(): void;
  onSettings(): void;
  banners: ReactNode;
}

/** Everything that must live inside `<Puck>`: it reads the Puck store (viewport, history) for the topbar. */
export function EditorChrome({ banners, locked, ...topbar }: Props) {
  const dispatch = usePuck((s) => s.dispatch);
  const viewports = usePuck((s) => s.appState.ui.viewports);
  const hasPast = usePuck((s) => s.history.hasPast);
  const hasFuture = usePuck((s) => s.history.hasFuture);
  // ⌘Z / ⇧⌘Z are bound by Puck itself to this same history.
  const back = usePuck((s) => s.history.back);
  const forward = usePuck((s) => s.history.forward);
  const breakpoint = useBreakpoint();
  const setBreakpoint = useBreakpointSetter();
  useBlockHistoryKeys(locked);

  const width = viewports.current.width;
  useEffect(() => setBreakpoint(breakpointFromWidth(width)), [width, setBreakpoint]);

  const selectBreakpoint = (next: Breakpoint) =>
    dispatch({ type: 'setUi', ui: { viewports: { ...viewports, current: { width: BREAKPOINT_WIDTH[next], height: 'auto' } } } });

  return (
    <>
      <EditorTopbar
        {...topbar}
        breakpoint={breakpoint}
        onBreakpoint={selectBreakpoint}
        onUndo={back}
        onRedo={forward}
        canUndo={!locked && hasPast}
        canRedo={!locked && hasFuture}
      />
      {banners}
      <div className={styles.body}>
        <div className={`${styles.left} ${locked ? styles.locked : ''}`}>
          <Puck.Components />
          <Puck.Outline />
        </div>
        <div className={`${styles.canvas} ${locked ? styles.locked : ''}`} data-testid="editor-canvas">
          <CanvasStage width={BREAKPOINT_WIDTH[breakpoint]}><Puck.Preview /></CanvasStage>
        </div>
        <div className={`${styles.right} ${locked ? styles.locked : ''}`}>
          <Puck.Fields />
        </div>
      </div>
    </>
  );
}
