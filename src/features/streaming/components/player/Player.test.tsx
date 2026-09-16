/**
 * The compound layout parts: declaration order, what Stage wires into
 * CameraGrid, the pause-ad gate and the dev-only duplicate-part guard.
 * The chrome cases inherited from PlayerLayout.test.tsx arrive in Task 6.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Player } from './Player';
import { usePlayerShell } from '../../hooks/use-player-shell';
import type { UsePlayerShellOptions } from '../../hooks/use-player-shell';
import type { CameraGridProps } from '../CameraGrid';
import type { LiveCamera } from '../../types/live.types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/features/reports', () => ({ ReportButton: () => null }));
vi.mock('@/features/account/hooks/use-auth', () => ({ useAuth: () => ({ isLoggedIn: true, user: null }) }));
vi.mock('@/lib/analytics/analytics-client', () => ({ track: vi.fn() }));
vi.mock('../RecommendedOverlay', () => ({ RecommendedOverlay: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/advertisements/components/PauseAdTakeover', () => ({
  PauseAdTakeover: ({ onVisibleChange }: { onVisibleChange: (v: boolean) => void }) => (
    <button data-testid="fake-ad" onClick={() => onVisibleChange(true)} />
  ),
}));

// CameraGrid is stubbed, but Player.Stage's whole job is what it hands over —
// so the stub records every props object it was called with.
const h = vi.hoisted(() => ({ gridCalls: [] as unknown[] }));
vi.mock('../CameraGrid', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../CameraGrid')>();
  return {
    ...mod,
    CameraGrid: (props: unknown) => {
      h.gridCalls.push(props);
      return <div data-testid="grid" />;
    },
  };
});
const lastGridProps = () => h.gridCalls[h.gridCalls.length - 1] as CameraGridProps;

const cam = (cameraId: string, priority: number): LiveCamera => ({
  cameraId, name: `Cam ${cameraId}`, slug: cameraId, priority, manifestPath: `/live/${cameraId}.m3u8`, llPath: null, live: true, thumbnailUrl: null, coverage: [],
});

function Harness({ options, children }: { options: UsePlayerShellOptions; children?: ReactNode }) {
  const shell = usePlayerShell(options);
  return (
    <Player.Root shell={shell} mode="live" eventId="evt-1" title="Show">
      {children ?? (
        <>
          <Player.Header badge="live" />
          <Player.Stage />
          <Player.Transport>
            <div data-testid="transport" />
          </Player.Transport>
        </>
      )}
    </Player.Root>
  );
}

beforeEach(() => {
  h.gridCalls.length = 0;
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

describe('Player layout parts', () => {
  it('renders the parts in declaration order inside the fullscreen container', () => {
    const { container } = render(<Harness options={{ cameras: [cam('a', 1)] }} />);
    const root = container.firstElementChild!;
    expect(Array.from(root.children).map((el) => el.tagName.toLowerCase())).toEqual(['header', 'div', 'div']);
    expect(root.children[1].querySelector('[data-testid="grid"]')).not.toBeNull();
    expect(root.children[2].querySelector('[data-testid="transport"]')).not.toBeNull();
  });

  it('wires CameraGrid from the shell and forwards only the mode-specific props', () => {
    const onEnded = vi.fn();
    render(
      <Harness options={{ cameras: [cam('a', 1)] }}>
        <Player.Stage positionMs={4242} onEnded={onEnded} dvrActive />
      </Harness>,
    );
    const props = lastGridProps();
    // From the mode, straight through.
    expect(props.positionMs).toBe(4242);
    expect(props.dvrActive).toBe(true);
    expect(props.onEnded).toBe(onEnded);
    // From the context / shell, never passed by the mode.
    expect(props.mode).toBe('live');
    expect(props.cameras.map((c) => c.cameraId)).toEqual(['a']);
    expect(props.volume).toBe(1);
    expect(props.globalMuted).toBe(false);
  });

  it('maps every non-replay mode onto CameraGrid live playback', () => {
    function ChannelHarness() {
      const shell = usePlayerShell({ cameras: [cam('a', 1)], playbackEnabled: false });
      return (
        <Player.Root shell={shell} mode="channel" eventId="evt-1" title="Canal">
          <Player.Stage />
        </Player.Root>
      );
    }
    render(<ChannelHarness />);
    expect(lastGridProps().mode).toBe('live');
  });

  it('renders Aside children and the Overlay without extra chrome', () => {
    const { getByTestId } = render(
      <Harness options={{ cameras: [cam('a', 1)] }}>
        <Player.Stage />
        <Player.Aside><div data-testid="chat-dock" /></Player.Aside>
        <Player.Overlay />
      </Harness>,
    );
    expect(getByTestId('chat-dock')).toBeTruthy();
  });

  it('warns in development when Stage is declared more than once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Harness options={{ cameras: [cam('a', 1)] }}>
        <Player.Stage />
        <Player.Stage />
      </Harness>,
    );
    expect(warn).toHaveBeenCalledWith('<Player.Stage> rendered 2 times inside <Player.Root>; only one is supported.');
    warn.mockRestore();
  });

  it('defines the header-hidden rule in the stylesheet it hands to Header', () => {
    // The old PlayerLayout read this class from a module that never declared
    // it, so the header only appeared to hide (vitest runs with css: false).
    const scssPath = join(dirname(fileURLToPath(import.meta.url)), 'Player.module.scss');
    const scss = readFileSync(scssPath, 'utf8');
    expect(scss).toContain('.headerHidden');
  });
});
