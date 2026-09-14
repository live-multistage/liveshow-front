/**
 * The shared player chrome: header wiring (badge, stage tabs, share, camera
 * drawer offset), the slots (transport / aside / extras) and pause-ad
 * visibility. Playback itself is covered by ReplayPlayer/ChannelPlayer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { PlayerLayout } from './PlayerLayout';
import { usePlayerShell } from '../hooks/use-player-shell';
import type { UsePlayerShellOptions } from '../hooks/use-player-shell';
import { DRAWER_W } from './CameraGrid';
import type { LiveCamera } from '../types/live.types';
import type { PlayerLayoutProps } from './PlayerLayout';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/features/reports', () => ({ ReportButton: () => null }));
vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: () => ({ isLoggedIn: true, user: null }) }));
vi.mock('@/lib/analytics/analytics-client', () => ({ track: vi.fn() }));
vi.mock('./RecommendedOverlay', () => ({ RecommendedOverlay: () => null }));
vi.mock('./CameraGrid', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./CameraGrid')>();
  return { ...mod, CameraGrid: () => <div data-testid="grid" /> };
});
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('@/features/advertisements/components/PauseAdTakeover', () => ({
  PauseAdTakeover: ({ onVisibleChange }: { onVisibleChange: (v: boolean) => void }) => (
    <button data-testid="fake-ad" onClick={() => onVisibleChange(true)} />
  ),
}));

const cam = (cameraId: string, priority: number): LiveCamera => ({
  cameraId, name: `Cam ${cameraId}`, slug: cameraId, priority, manifestPath: `/live/${cameraId}.m3u8`, llPath: null, live: true, thumbnailUrl: null, coverage: [],
});

function Harness({ options, layout }: { options: UsePlayerShellOptions; layout: Partial<PlayerLayoutProps> }) {
  const shell = usePlayerShell(options);
  return (
    <PlayerLayout
      shell={shell}
      mode="live"
      badge="live"
      title="Show"
      eventId="evt-1"
      transport={<div data-testid="transport">{shell.paused ? 'paused' : 'playing'}</div>}
      {...layout}
    />
  );
}

beforeEach(() => {
  pushMock.mockClear();
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

describe('PlayerLayout', () => {
  it('renders header badge, the transport slot and starts paused when asked', () => {
    const { getByText, getByTestId } = render(
      <Harness options={{ cameras: [cam('a', 1)], initialPaused: true }} layout={{ badge: 'replay' }} />,
    );
    expect(getByText('REPLAY')).toBeTruthy();
    expect(getByTestId('transport').textContent).toBe('paused');
  });

  it('offsets the header by DRAWER_W while the camera drawer is open', () => {
    const { container, getByTitle } = render(<Harness options={{ cameras: [cam('a', 1), cam('b', 2)] }} layout={{}} />);
    const header = container.querySelector('header')!;
    expect(header.style.right).toBe('');
    fireEvent.click(getByTitle('toggleCameras'));
    expect(header.style.right).toBe(`${DRAWER_W}px`);
  });

  it('renders stage tabs and notifies the mode on stage change', () => {
    const onStageChange = vi.fn();
    const stages = [
      { stageId: 's1', name: 'Palco A', slug: 'a', position: 0, cameras: [cam('a', 1)] },
      { stageId: 's2', name: 'Palco B', slug: 'b', position: 1, cameras: [cam('b', 1)] },
    ];
    const { getByRole } = render(<Harness options={{ cameras: [], stages, onStageChange }} layout={{}} />);
    expect(onStageChange).toHaveBeenCalledTimes(1); // initial stage
    fireEvent.click(getByRole('tab', { name: /Palco B/ }));
    expect(onStageChange).toHaveBeenCalledTimes(2);
    expect(getByRole('tab', { name: /Palco B/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('shows chat and viewer chrome only when given', () => {
    const onToggle = vi.fn();
    const { getByTitle, queryByTitle, rerender } = render(
      <Harness options={{ cameras: [cam('a', 1)] }} layout={{ chat: { open: false, onToggle, messageCount: 3 }, currentViewers: 12 }} />,
    );
    fireEvent.click(getByTitle('toggleChat'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<Harness options={{ cameras: [cam('a', 1)] }} layout={{}} />);
    expect(queryByTitle('toggleChat')).toBeNull();
  });

  it('renders aside and extras slots, and exits to the event page', () => {
    const { getByTestId, getByLabelText } = render(
      <Harness options={{ cameras: [cam('a', 1)] }} layout={{ aside: <div data-testid="aside" />, extras: <div data-testid="extras" /> }} />,
    );
    expect(getByTestId('aside')).toBeTruthy();
    expect(getByTestId('extras')).toBeTruthy();
    fireEvent.click(getByLabelText('back'));
    expect(pushMock).toHaveBeenCalledWith('/events/evt-1');
  });

  it('hides the header while the pause ad is on screen', () => {
    const { container, getByTestId } = render(
      <Harness options={{ cameras: [cam('a', 1)], initialPaused: true }} layout={{}} />,
    );
    const header = container.querySelector('header')!;
    expect(header.className).not.toMatch(/headerHidden/);
    act(() => { fireEvent.click(getByTestId('fake-ad')); });
    expect(header.className).toMatch(/headerHidden/);
  });
});
