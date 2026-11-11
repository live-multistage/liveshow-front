'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Breakpoint } from '@live-show/api-contracts';
import styles from './PageEditorV2.module.scss';

/** Largest scale (never above 1) at which a canvas of `width` fits `available`. */
export const fitScale = (available: number, width: number) => (available > 0 ? Math.min(1, available / width) : 1);

/** "DESKTOP · 1280PX · 60%": the scale only shows when the canvas is shrunk. */
export const canvasSizeLabel = (device: string, width: number, scale: number) =>
  [device.toUpperCase(), `${width}PX`, scale < 1 ? `${Math.round(scale * 100)}%` : null].filter(Boolean).join(' · ');

/**
 * The page is scaled by its own root (inside Puck's preview), not by a wrapper around the preview: Puck draws the selection,
 * hover and tag overlays from screen rects into the preview element, so that element must not be scaled itself.
 * `CanvasPage` hands the stage its root to measure the unscaled height.
 */
const RootRefContext = createContext<(el: HTMLElement | null) => void>(() => undefined);
export const useCanvasRootRef = () => useContext(RootRefContext);

/** The scaled page root (puck root render). `--canvas-scale` and `--canvas-width` come from CanvasStage. */
export function CanvasPage({ children }: { children: ReactNode }) {
  return <div ref={useCanvasRootRef()} className={styles.canvasRoot}>{children}</div>;
}

interface Props {
  /** Real breakpoint width: the renderers' container queries answer to it, so it is never shrunk. */
  width: number;
  breakpoint: Breakpoint;
  /** Name of the breakpoint, for the size label. */
  deviceLabel: string;
  /** Left side of the canvas bar (the selection trail). */
  crumbs: ReactNode;
  /** Drawn over the page (empty-page state). */
  overlay?: ReactNode;
  children: ReactNode;
}

/** Puck's own zoom only exists with the iframe; here the canvas keeps its real width and is scaled to fit the pane. */
export function CanvasStage({ width, breakpoint, deviceLabel, crumbs, overlay, children }: Props) {
  const pane = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const rootRef = useCallback((el: HTMLElement | null) => setRoot(el), []);

  useLayoutEffect(() => {
    const paneEl = pane.current;
    if (!paneEl) return;
    const measure = () => {
      setScale(fitScale(paneEl.clientWidth, width));
      if (root) setHeight(root.offsetHeight);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(paneEl);
    if (root) observer.observe(root);
    return () => observer.disconnect();
  }, [width, root]);

  return (
    <>
      <div className={styles.canvasBar}>
        {crumbs}
        <span className={styles.canvasSize} data-testid="canvas-size">{canvasSizeLabel(deviceLabel, width, scale)}</span>
      </div>
      <div className={styles.canvasScroll}>
        <div ref={pane} className={styles.stage} data-testid="canvas-stage">
          <RootRefContext.Provider value={rootRef}>
            <div
              className={styles.stagePage}
              data-device={breakpoint}
              style={{
                width: width * scale,
                height: height === undefined ? undefined : height * scale,
                '--canvas-scale': scale,
                '--canvas-width': `${width}px`,
                '--canvas-iz': 1 / scale,
              } as React.CSSProperties}
            >
              {children}
              {overlay}
            </div>
          </RootRefContext.Provider>
        </div>
      </div>
    </>
  );
}
