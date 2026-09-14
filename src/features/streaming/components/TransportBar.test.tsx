/**
 * Mode-agnostic transport chrome: the badge and scrubber are slots, so this
 * suite only covers the bar's own wiring. Live DVR rules live in
 * transport/live-scrubber.test.ts, the AO VIVO badge in transport/LiveBadge.test.tsx.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TransportBar } from './TransportBar';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

const baseProps = {
  paused: false,
  onTogglePlay: vi.fn(),
  badge: <span>BADGE</span>,
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

describe('TransportBar — slots', () => {
  it('renders whatever badge it is given', () => {
    const { getByText } = render(<TransportBar {...baseProps} />);
    expect(getByText('BADGE')).toBeInTheDocument();
  });

  it('renders the scrubber over the given range with its labels', () => {
    const onSeek = vi.fn();
    const { getByLabelText, getByText } = render(
      <TransportBar
        {...baseProps}
        scrubber={{ min: 0, max: 3606, value: 1200, onSeek, leadingLabel: '-40:00', trailingLabel: '60:06' }}
      />,
    );
    const slider = getByLabelText('seekPosition') as HTMLInputElement;
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('3606');
    expect(slider.value).toBe('1200');
    expect(getByText('-40:00')).toBeInTheDocument();
    expect(getByText('60:06')).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: '900' } });
    expect(onSeek).toHaveBeenCalledWith(900);
  });

  it('renders no scrubber when the slot is null', () => {
    const { queryByLabelText } = render(<TransportBar {...baseProps} scrubber={null} />);
    expect(queryByLabelText('seekPosition')).toBeNull();
  });
});

describe('TransportBar — play/pause', () => {
  it('exposes a pause control while playing', () => {
    const onTogglePlay = vi.fn();
    const { getByLabelText } = render(<TransportBar {...baseProps} paused={false} onTogglePlay={onTogglePlay} />);
    fireEvent.click(getByLabelText('pause'));
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('flips to a play control once paused', () => {
    const { getByLabelText, queryByLabelText } = render(<TransportBar {...baseProps} paused />);
    expect(getByLabelText('play')).toBeInTheDocument();
    expect(queryByLabelText('pause')).toBeNull();
  });
});

// A channel is a broadcast with no archive behind it: nothing to pause into.
// The badge stays — a channel is always live.
describe('TransportBar — showPlayback=false', () => {
  it('drops the play/pause control but keeps the badge', () => {
    const { queryByLabelText, getByText } = render(<TransportBar {...baseProps} showPlayback={false} />);
    expect(queryByLabelText('pause')).toBeNull();
    expect(queryByLabelText('play')).toBeNull();
    expect(getByText('BADGE')).toBeInTheDocument();
  });
});
