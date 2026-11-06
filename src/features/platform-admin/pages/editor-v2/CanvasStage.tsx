'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import styles from './PageEditorV2.module.scss';

/** Largest scale (never above 1) at which a canvas of `width` fits `available`. */
export const fitScale = (available: number, width: number) => (available > 0 ? Math.min(1, available / width) : 1);

interface Props {
  /** Real breakpoint width: the renderers' container queries answer to it, so it is never shrunk. */
  width: number;
  children: ReactNode;
}

/** Puck's own zoom only exists with the iframe; here the canvas keeps its real width and is scaled to fit the pane. */
export function CanvasStage({ width, children }: Props) {
  const pane = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const paneEl = pane.current;
    const pageEl = page.current;
    if (!paneEl || !pageEl) return;
    const measure = () => {
      setScale(fitScale(paneEl.clientWidth, width));
      setHeight(pageEl.offsetHeight);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(paneEl);
    observer.observe(pageEl);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div ref={pane} className={styles.stage} data-testid="canvas-stage">
      <div className={styles.sizer} style={{ width: width * scale, height: height === undefined ? undefined : height * scale }}>
        <div ref={page} className={styles.stagePage} style={{ width, transform: `scale(${scale})` }}>{children}</div>
      </div>
    </div>
  );
}
