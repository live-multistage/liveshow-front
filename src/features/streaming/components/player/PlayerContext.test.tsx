import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PlayerProvider, usePlayer } from './PlayerContext';
import type { PlayerContextValue } from './PlayerContext';
import type { PlayerShell } from '../../hooks/use-player-shell';

describe('usePlayer', () => {
  it('throws when a part is rendered outside <Player.Root>', () => {
    function Orphan() {
      usePlayer();
      return null;
    }
    // React logs the thrown render error; silence it so the run stays readable.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Orphan />)).toThrow('Player parts must be rendered inside <Player.Root>');
    errorSpy.mockRestore();
  });

  it('hands the provided value to every part below it', () => {
    // The parts are what exercise the real shell; here only identity matters.
    const value: PlayerContextValue = {
      shell: {} as PlayerShell,
      mode: 'replay',
      eventId: 'evt-1',
      playbackEventId: 'evt-1',
      title: 'Show',
      adsEnabled: true,
    };
    let seen: PlayerContextValue | null = null;
    function Reader() {
      seen = usePlayer();
      return null;
    }
    render(
      <PlayerProvider value={value}>
        <Reader />
      </PlayerProvider>,
    );
    expect(seen).toBe(value);
  });
});
