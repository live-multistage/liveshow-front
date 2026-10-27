import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { LivePlaybackResponse } from '../types/live.types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));
// The real parts mount HLS video; this suite is about the preview's own chrome.
vi.mock('./player', () => ({
  Player: {
    Root: ({ children }: { children: ReactNode }) => <div data-testid="player-root">{children}</div>,
    Stage: () => <div data-testid="player-stage" />,
  },
}));

import { LivePreview } from './LivePreview';

const playback: LivePlaybackResponse = {
  eventId: 'evt-1', live: true, latencyMode: 'STANDARD', primaryCameraId: 'a', librasCameraId: null,
  cameras: [{ cameraId: 'a', name: 'A', slug: 'a', priority: 1, manifestPath: '/a.m3u8', llPath: null, live: true, thumbnailUrl: null, coverage: [] }],
};

describe('LivePreview', () => {
  it('starts muted and toggles the sound', () => {
    render(<LivePreview eventId="evt-1" title="Evento" playback={playback} />);

    fireEvent.click(screen.getByRole('button', { name: 'enableSound' }));

    expect(screen.getByRole('button', { name: 'muteSound' })).toBeInTheDocument();
  });

  it('opens the full player for the event', () => {
    render(<LivePreview eventId="evt-1" title="Evento" playback={playback} />);

    expect(screen.getByRole('link', { name: /openPlayer/ })).toHaveAttribute('href', '/live/evt-1');
    expect(screen.getByTestId('player-stage')).toBeInTheDocument();
  });
});
