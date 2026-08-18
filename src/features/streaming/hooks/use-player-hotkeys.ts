import { useEffect } from 'react';

export interface PlayerHotkeys {
  onToggleFullscreen: () => void;
  onToggleCameraPanel: () => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  enabled?: boolean;
}

// Space is also the browser's own activation key for a focused button or link.
// Stealing it there would break every control in the player for keyboard users:
// tabbing to "fullscreen" and pressing Space would toggle playback instead of
// entering fullscreen. So Space only reaches the player when focus is somewhere
// inert.
function activatesFocusedControl(target: EventTarget | null): boolean {
  // The listener is on window, so an unfocused press reports window itself as
  // the target — narrow before touching any element API.
  if (!(target instanceof HTMLElement)) return false;
  return /^(BUTTON|A)$/.test(target.tagName) || target.getAttribute('role') === 'button';
}

// Keyboard shortcuts shared by the live and replay players:
//   f → fullscreen, c → camera panel, m → mute, Space → play/pause,
//   ArrowUp/Down → volume.
// Ignored while typing (chat, inputs) or when a modifier is held, so it never
// hijacks browser/OS shortcuts.
export function usePlayerHotkeys({
  onToggleFullscreen,
  onToggleCameraPanel,
  onToggleMute,
  onTogglePlay,
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
        // 'Spacebar' is the legacy key name still reported by older Edge/IE.
        case ' ': case 'Spacebar':
          if (activatesFocusedControl(target)) return;
          onTogglePlay();
          break;
        case 'ArrowUp': onVolumeUp(); break;
        case 'ArrowDown': onVolumeDown(); break;
        default: return;
      }
      // Space would scroll the page, arrows would scroll it too — the player
      // owns these keys once it has decided to act on them.
      e.preventDefault();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggleFullscreen, onToggleCameraPanel, onToggleMute, onTogglePlay, onVolumeUp, onVolumeDown, enabled]);
}

export const VOLUME_STEP = 0.05;
export const clampVolume = (v: number) => Math.min(1, Math.max(0, v));
