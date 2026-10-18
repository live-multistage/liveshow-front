/**
 * The header is a transparent gradient bar that floats above the whole
 * player, including the camera drawer's DRAWER_W-wide strip on the right
 * (see CameraGrid). Two bugs already shipped and got reverted here:
 *   1. Padding the header's CONTENTS instead of constraining its own box
 *      left the (still full-width) bar's transparent right edge sitting
 *      over the drawer's close/mode buttons.
 *   2. Even with the box constrained, a click-through overlay bar needs
 *      `pointer-events: none` on itself and `auto` on its own controls, or
 *      any transparent region still eats clicks meant for whatever is
 *      underneath.
 * jsdom doesn't do real hit-testing and (per vitest.config.ts `css: false`)
 * never applies the SCSS rules at all, so neither bug is directly
 * reproducible here. This file asserts the structural facts that prevent
 * them instead: the inline geometry LivePlayer sets, and — read straight
 * from the stylesheet source — that the pointer-events hygiene rule exists.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { Header } from './Header';
import { DRAWER_W } from './CameraGrid';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/features/reports', () => ({ ReportButton: () => null }));

const baseProps = {
  badge: 'live' as const,
  cameraStripOpen: false,
  eventId: 'evt-1',
  metaLine: 'Palco principal',
  stages: [],
  activeStageId: '',
  onStageChange: vi.fn(),
  onExit: vi.fn(),
  currentViewers: 0,
  cameraCount: 2,
  onToggleCameraStrip: vi.fn(),
  chatEnabled: false,
  chatOpen: false,
  onToggleChat: vi.fn(),
  chatMessageCount: 0,
  onShare: vi.fn(),
};

describe('Header — stays clear of the camera drawer', () => {
  it('does not constrain its box when the drawer is closed', () => {
    const { container } = render(
      <Header {...baseProps} cameraStripOpen={false} style={undefined} />,
    );
    expect(container.querySelector('header')!.style.right).toBe('');
  });

  it('accepts a `right` geometry constraint (set by LivePlayer to DRAWER_W while the drawer is open)', () => {
    const { container } = render(
      <Header {...baseProps} cameraStripOpen style={{ right: DRAWER_W }} />,
    );
    expect(container.querySelector('header')!.style.right).toBe(`${DRAWER_W}px`);
  });

  it('still forwards the camera-toggle click through the (correctly offset) bar', () => {
    const onToggleCameraStrip = vi.fn();
    const { getByTitle } = render(
      <Header {...baseProps} cameraStripOpen style={{ right: DRAWER_W }} onToggleCameraStrip={onToggleCameraStrip} />,
    );
    fireEvent.click(getByTitle('toggleCameras'));
    expect(onToggleCameraStrip).toHaveBeenCalledTimes(1);
  });

  it('declares pointer-events: none on the bar and auto on its buttons/links in the stylesheet', () => {
    const scss = readFileSync(join(__dirname, 'Header.module.scss'), 'utf-8');
    const headerRule = scss.slice(scss.indexOf('.header {'), scss.indexOf('.backBtn'));
    expect(headerRule).toMatch(/pointer-events:\s*none/);
    expect(headerRule).toMatch(/button,\s*\n\s*a\s*\{\s*\n\s*pointer-events:\s*auto/);
  });
});

describe('Header — badge and optional live-only chrome', () => {
  it('renders the REPLAY badge for replay and no viewer count', () => {
    const { getByText, queryByText, container } = render(
      <Header {...baseProps} badge="replay" currentViewers={undefined} />,
    );
    expect(getByText('REPLAY')).toBeTruthy();
    expect(queryByText('AO VIVO')).toBeNull();
    expect(container.querySelector('svg.lucide-users')).toBeNull();
  });

  it('renders AO VIVO for live', () => {
    const { getByText } = render(<Header {...baseProps} badge="live" />);
    expect(getByText('AO VIVO')).toBeTruthy();
  });

  it('omits the chat button when chat is disabled', () => {
    const { queryByTitle } = render(
      <Header {...baseProps} badge="replay" chatEnabled={false} chatOpen={undefined} onToggleChat={undefined} chatMessageCount={undefined} />,
    );
    expect(queryByTitle('toggleChat')).toBeNull();
  });
});

describe('Header — chapters pill', () => {
  it('is absent unless the player passes chapters', () => {
    const { queryByLabelText } = render(<Header {...baseProps} />);
    expect(queryByLabelText('chapters.open')).toBeNull();
  });

  it('shows the visible-chapter count and toggles the drawer', () => {
    const onToggle = vi.fn();
    const { getByLabelText, getByText } = render(
      <Header {...baseProps} chapters={{ open: false, onToggle, count: 6 }} />,
    );
    expect(getByText('6')).toBeTruthy();
    fireEvent.click(getByLabelText('chapters.open'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('keeps a stable name and conveys state with aria-expanded', () => {
    const { getByLabelText } = render(<Header {...baseProps} chapters={{ open: true, onToggle: vi.fn(), count: 6 }} />);
    expect(getByLabelText('chapters.open')).toHaveAttribute('aria-expanded', 'true');
  });

});

describe('Header — transmission selector', () => {
  const streams = [
    { id: 'main', title: 'Principal', live: true },
    { id: 'vip', title: 'VIP', live: false },
  ];

  it('is hidden with a single transmission', () => {
    const { queryByLabelText, queryByText } = render(
      <Header {...baseProps} streams={[streams[0]]} activeStreamId="main" onStreamChange={vi.fn()} />,
    );
    expect(queryByLabelText('switchTransmission')).toBeNull();
    expect(queryByText('Principal')).toBeNull();
  });

  it('shows the active transmission on the trigger and in the breadcrumb', () => {
    const { getByLabelText, container } = render(
      <Header {...baseProps} streams={streams} activeStreamId="vip" onStreamChange={vi.fn()} />,
    );
    expect(getByLabelText('switchTransmission').textContent).toContain('VIP');
    expect(container.querySelector('header')!.textContent).toContain('VIP · Palco principal');
  });

  it('lists the granted transmissions, marks the offline one, and reports a switch', () => {
    const onStreamChange = vi.fn();
    const { getByLabelText, getByRole, queryByRole } = render(
      <Header {...baseProps} streams={streams} activeStreamId="main" onStreamChange={onStreamChange} />,
    );
    const trigger = getByLabelText('switchTransmission');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(queryByRole('dialog')).toBeNull();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panel = getByRole('dialog', { name: 'transmissions' });
    const rows = within(panel).getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed'));
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Principal'),
      expect.stringContaining('VIP'),
    ]);
    expect(rows[0]).toHaveAttribute('aria-pressed', 'true');
    expect(rows[1]).toHaveAttribute('aria-pressed', 'false');
    expect(within(rows[0]).getByText('transmissionLive')).toBeTruthy();
    expect(within(rows[1]).getByText('transmissionOffline')).toBeTruthy();

    fireEvent.click(rows[1]);
    expect(onStreamChange).toHaveBeenCalledWith('vip');
    expect(queryByRole('dialog')).toBeNull();
  });

  it('moves focus into the panel, and Esc closes it and returns focus to the trigger', () => {
    const { getByLabelText, getByRole, queryByRole } = render(
      <Header {...baseProps} streams={streams} activeStreamId="vip" onStreamChange={vi.fn()} />,
    );
    const trigger = getByLabelText('switchTransmission');
    fireEvent.click(trigger);
    const panel = getByRole('dialog', { name: 'transmissions' });
    expect(document.activeElement).toBe(within(panel).getByRole('button', { pressed: true }));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes from the close button and from the scrim', () => {
    const { getByLabelText, getByRole, queryByRole, getByTestId } = render(
      <Header {...baseProps} streams={streams} activeStreamId="main" onStreamChange={vi.fn()} />,
    );
    const trigger = getByLabelText('switchTransmission');
    fireEvent.click(trigger);
    fireEvent.click(within(getByRole('dialog')).getByLabelText('closePanel'));
    expect(queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    fireEvent.click(getByTestId('transmission-scrim'));
    expect(queryByRole('dialog')).toBeNull();
  });

  it('mirrors live in replay: same selector, rows carry REPLAY and the window length', () => {
    const replayStreams = [
      { id: 'main', title: 'Principal', durationMs: (2 * 60 + 14) * 60_000 },
      { id: 'bts', title: 'Bastidores', durationMs: 48 * 60_000 },
    ];
    const { getByLabelText, getByRole } = render(
      <Header {...baseProps} badge="replay" streams={replayStreams} activeStreamId="main" onStreamChange={vi.fn()} />,
    );
    fireEvent.click(getByLabelText('switchTransmission'));
    const panel = getByRole('dialog', { name: 'transmissions' });
    expect(within(panel).getByText('REPLAY · 2h 14min')).toBeTruthy();
    expect(within(panel).getByText('REPLAY · 48min')).toBeTruthy();
    expect(within(panel).queryByText('transmissionOffline')).toBeNull();
  });
});
