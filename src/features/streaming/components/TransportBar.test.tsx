/**
 * Live DVR chrome: the AO VIVO badge's two states (at the live edge vs.
 * scrubbed back into the DVR window) and the seek scrubber that appears once
 * the manifest actually carries a window worth scrubbing.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TransportBar } from './TransportBar';
import type { DvrState } from './TransportBar';

const baseProps = {
  globalMuted: false,
  onToggleMute: vi.fn(),
  volume: 1,
  onVolumeChange: vi.fn(),
  audioCameras: [],
  effectiveAudioCameraId: null,
  onAudioCameraChange: vi.fn(),
  levels: [],
  currentLevel: -1,
  qualityLabel: 'Auto',
  onSelectLevel: vi.fn(),
  onTogglePip: vi.fn(),
  isFullscreen: false,
  onToggleFullscreen: vi.fn(),
};

// A one-hour DVR window whose live edge sits at 3600s.
const dvrAt = (position: number): DvrState => ({
  start: 0,
  end: 3606,
  position,
  edge: 3600,
});

describe('TransportBar — AO VIVO badge', () => {
  it('is lit and non-interactive while at the live edge', () => {
    const { getByText, queryByRole } = render(
      <TransportBar {...baseProps} dvr={dvrAt(3599)} atLive onSeek={vi.fn()} />,
    );
    expect(getByText('AO VIVO').tagName).toBe('SPAN');
    expect(queryByRole('button', { name: 'Voltar ao ao vivo' })).toBeNull();
  });

  it('stays lit before any position has been reported (no dvr yet)', () => {
    const { getByText } = render(<TransportBar {...baseProps} />);
    expect(getByText('AO VIVO').tagName).toBe('SPAN');
  });

  it('becomes a dimmed, clickable control once scrubbed back', () => {
    const { getByRole } = render(
      <TransportBar {...baseProps} dvr={dvrAt(1200)} atLive={false} onSeek={vi.fn()} />,
    );
    const badge = getByRole('button', { name: 'Voltar ao ao vivo' });
    expect(badge.className).not.toBe('');
    expect(badge.textContent).toContain('AO VIVO');
  });

  it('clicking it seeks back to the live edge, not to the seekable end', () => {
    const onSeek = vi.fn();
    const { getByRole } = render(
      <TransportBar {...baseProps} dvr={dvrAt(1200)} atLive={false} onSeek={onSeek} />,
    );
    fireEvent.click(getByRole('button', { name: 'Voltar ao ao vivo' }));
    expect(onSeek).toHaveBeenCalledWith(3600);
  });
});

describe('TransportBar — DVR scrubber', () => {
  it('renders over the seekable window, positioned at the current time', () => {
    const { getByLabelText } = render(
      <TransportBar {...baseProps} dvr={dvrAt(1200)} atLive={false} onSeek={vi.fn()} />,
    );
    const slider = getByLabelText('Posição de reprodução') as HTMLInputElement;
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('3606');
    expect(slider.value).toBe('1200');
  });

  it('shows how far behind the live edge the viewer is', () => {
    const { getByText } = render(
      <TransportBar {...baseProps} dvr={dvrAt(3517)} atLive={false} onSeek={vi.fn()} />,
    );
    expect(getByText('-1:23')).toBeTruthy();
  });

  it('dragging it reports the new position', () => {
    const onSeek = vi.fn();
    const { getByLabelText } = render(
      <TransportBar {...baseProps} dvr={dvrAt(3599)} atLive onSeek={onSeek} />,
    );
    fireEvent.change(getByLabelText('Posição de reprodução'), { target: { value: '900' } });
    expect(onSeek).toHaveBeenCalledWith(900);
  });

  it('stays hidden while the window is only the player buffer (no real DVR)', () => {
    const { queryByLabelText } = render(
      <TransportBar
        {...baseProps}
        dvr={{ start: 100, end: 112, position: 106, edge: 106 }}
        atLive
        onSeek={vi.fn()}
      />,
    );
    expect(queryByLabelText('Posição de reprodução')).toBeNull();
  });

  it('stays hidden when nothing can act on a seek', () => {
    const { queryByLabelText } = render(<TransportBar {...baseProps} dvr={dvrAt(1200)} atLive />);
    expect(queryByLabelText('Posição de reprodução')).toBeNull();
  });
});
