'use client';

import { createContext, useContext } from 'react';
import type { PlayerShell } from '../../hooks/use-player-shell';

export type PlayerMode = 'live' | 'replay' | 'channel';

// Everything the player parts share. Optional Root props (playbackEventId,
// adsEnabled) are resolved to concrete values BEFORE they land here, so no
// part has to re-apply a default and drift from its siblings.
export interface PlayerContextValue {
  shell: PlayerShell;
  mode: PlayerMode;
  // Chat room + header/exit target. A channel passes its own broadcast event.
  eventId: string;
  // What the pause-ad takeover and in-player ad revenue share are keyed on —
  // the event actually on screen, which for a channel is the resolved source.
  playbackEventId: string;
  title: string;
  adsEnabled: boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export const PlayerProvider = PlayerContext.Provider;

export function usePlayer(): PlayerContextValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('Player parts must be rendered inside <Player.Root>');
  return value;
}
