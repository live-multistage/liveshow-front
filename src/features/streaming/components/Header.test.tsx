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
import { render, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { DRAWER_W } from './CameraGrid';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/features/reports', () => ({ ReportButton: () => null }));

const baseProps = {
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
    const headerRule = scss.slice(scss.indexOf('.header {'), scss.indexOf('.headerHidden'));
    expect(headerRule).toMatch(/pointer-events:\s*none/);
    expect(headerRule).toMatch(/button,\s*\n\s*a\s*\{\s*\n\s*pointer-events:\s*auto/);
  });
});
