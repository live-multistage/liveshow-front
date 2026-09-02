'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';

// Fullscreen state for a player container, synced with the real
// `fullscreenchange` event — local toggle state alone goes stale the moment
// the viewer exits with Esc (the browser leaves fullscreen without telling
// React), which matters for anything rendered only in fullscreen.
export function useFullscreen(containerRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const el = containerRef.current;
      setIsFullscreen(!!el && document.fullscreenElement === el);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [containerRef]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else containerRef.current?.requestFullscreen?.();
  }, [containerRef]);

  return { isFullscreen, toggleFullscreen };
}
