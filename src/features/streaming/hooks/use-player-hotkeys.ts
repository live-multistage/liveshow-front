import { useEffect } from 'react';

export interface PlayerHotkeys {
  onToggleFullscreen: () => void;
  onToggleCameraPanel: () => void;
  onToggleMute: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  enabled?: boolean;
}

// Keyboard shortcuts shared by the live and replay players:
//   f → fullscreen, c → camera panel, m → mute, ArrowUp/Down → volume.
// Ignored while typing (chat, inputs) or when a modifier is held, so it never
// hijacks browser/OS shortcuts.
export function usePlayerHotkeys({
  onToggleFullscreen,
  onToggleCameraPanel,
  onToggleMute,
  onVolumeUp,
  onVolumeDown,
  enabled = true,
}: PlayerHotkeys) {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;

      switch (e.key) {
        case 'f': case 'F': onToggleFullscreen(); break;
        case 'c': case 'C': onToggleCameraPanel(); break;
        case 'm': case 'M': onToggleMute(); break;
        case 'ArrowUp': onVolumeUp(); break;
        case 'ArrowDown': onVolumeDown(); break;
        default: return;
      }
      e.preventDefault();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggleFullscreen, onToggleCameraPanel, onToggleMute, onVolumeUp, onVolumeDown, enabled]);
}

export const VOLUME_STEP = 0.05;
export const clampVolume = (v: number) => Math.min(1, Math.max(0, v));
