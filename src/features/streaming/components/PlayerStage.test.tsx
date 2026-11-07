/**
 * The stage's per-mode chrome. A channel has no archive behind its ~12s origin
 * window, so it cannot be paused — the pause-ad takeover, the center play
 * overlay and the paused chip are meaningless there. The watermark is not.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PlayerStage } from './PlayerStage';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

vi.mock('@/features/advertisements/components/PauseAdTakeover', () => ({
  PauseAdTakeover: () => <div data-testid="pause-ad" />,
}));

vi.mock('./SessionWatermark', () => ({
  SessionWatermark: () => <div data-testid="watermark" />,
}));

const baseProps = {
  eventId: 'e1',
  paused: true,
  onResume: vi.fn(),
  pauseAdVisible: true,
  onPauseAdVisibleChange: vi.fn(),
};

describe('PlayerStage — channel mode', () => {
  it('renders the grid and the watermark', () => {
    const { getByText, getByTestId } = render(
      <PlayerStage {...baseProps} mode="channel">
        <div>grid</div>
      </PlayerStage>,
    );

    expect(getByText('grid')).toBeInTheDocument();
    expect(getByTestId('watermark')).toBeInTheDocument();
  });

  it('drops the pause-ad takeover, the center play overlay and the paused chip', () => {
    const { queryByTestId, queryByLabelText, queryByText } = render(
      <PlayerStage {...baseProps} mode="channel">
        <div>grid</div>
      </PlayerStage>,
    );

    expect(queryByTestId('pause-ad')).toBeNull();
    expect(queryByLabelText('resume')).toBeNull();
    expect(queryByText('pausedChipLive')).toBeNull();
  });
});

describe('PlayerStage — live mode', () => {
  it('keeps the pause-ad takeover, the center play overlay and the paused chip', () => {
    const { getByTestId, getByLabelText, getByText } = render(
      <PlayerStage {...baseProps} mode="live">
        <div>grid</div>
      </PlayerStage>,
    );

    expect(getByTestId('pause-ad')).toBeInTheDocument();
    expect(getByLabelText('resume')).toBeInTheDocument();
    expect(getByText('pausedChipLive')).toBeInTheDocument();
  });

  it('never mounts the pause-ad takeover when adsEnabled is false, even while paused', () => {
    const { queryByTestId } = render(
      <PlayerStage {...baseProps} mode="live" adsEnabled={false}>
        <div>grid</div>
      </PlayerStage>,
    );

    expect(queryByTestId('pause-ad')).toBeNull();
  });
});

describe('PlayerStage — pause ad layouts', () => {
  const stageOf = (container: HTMLElement) => container.querySelector('[class*="stageArea"]') as HTMLElement;

  it('STANDARD shrinks the stage into a card and keeps the paused chip', () => {
    const { container, getByText } = render(
      <PlayerStage {...baseProps} mode="live" pauseAdLayout="STANDARD">
        <div>grid</div>
      </PlayerStage>,
    );
    expect(stageOf(container).className).toContain('stageAreaShrunk');
    expect(getByText('pausedChipLive')).toBeInTheDocument();
  });

  it('FULLSCREEN hides the stage, the center play button and the paused chip', () => {
    const { container, queryByLabelText, queryByText } = render(
      <PlayerStage {...baseProps} mode="live" pauseAdLayout="FULLSCREEN">
        <div>grid</div>
      </PlayerStage>,
    );
    expect(stageOf(container).className).toContain('stageAreaHidden');
    expect(stageOf(container).className).not.toContain('stageAreaShrunk');
    expect(queryByLabelText('resume')).toBeNull();
    expect(queryByText('pausedChipLive')).toBeNull();
  });

  it('with no ad on screen the stage is untouched in either layout', () => {
    const { container } = render(
      <PlayerStage {...baseProps} pauseAdVisible={false} mode="live" pauseAdLayout="FULLSCREEN">
        <div>grid</div>
      </PlayerStage>,
    );
    expect(stageOf(container).className).not.toContain('stageAreaHidden');
  });
});
