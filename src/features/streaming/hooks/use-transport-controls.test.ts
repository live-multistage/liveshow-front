/**
 * Live DVR reporting. In live mode video.duration is Infinity (hls.js declares
 * an endless media source and publishes the window through
 * setLiveSeekableRange), so the scrubber's bounds and the "am I live?" answer
 * have to come from video.seekable + hls.liveSyncPosition — not from duration.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, fireEvent } from '@testing-library/react';
import type Hls from 'hls.js';
import type { RefObject } from 'react';
import type { ReplaySegmentCoverage } from '../utils/replay-timeline';
import {
  useTransportControls,
  isAtLiveEdge,
  LIVE_EDGE_TOLERANCE_SEC,
  NATIVE_LIVE_EDGE_TOLERANCE_SEC,
} from './use-transport-controls';

describe('isAtLiveEdge', () => {
  it('treats normal drift around the live sync position as live', () => {
    expect(isAtLiveEdge(3600, 3600)).toBe(true);
    expect(isAtLiveEdge(3598, 3600)).toBe(true);
    // Ahead of the sync position (hls.js catching up) is still live.
    expect(isAtLiveEdge(3602, 3600)).toBe(true);
  });

  it('treats a deliberate scrub back as not live', () => {
    expect(isAtLiveEdge(3600 - LIVE_EDGE_TOLERANCE_SEC - 0.1, 3600)).toBe(false);
    expect(isAtLiveEdge(1200, 3600)).toBe(false);
  });

  it("counts Safari native's parked position as live under the wider tolerance", () => {
    // Native HLS starts ~3 target durations behind the playlist end.
    expect(isAtLiveEdge(3588, 3600)).toBe(false);
    expect(isAtLiveEdge(3588, 3600, NATIVE_LIVE_EDGE_TOLERANCE_SEC)).toBe(true);
    // A real scrub back is still not live, even there.
    expect(isAtLiveEdge(1200, 3600, NATIVE_LIVE_EDGE_TOLERANCE_SEC)).toBe(false);
  });
});

// A <video> whose seekable window and currentTime are under test control —
// jsdom gives every element an empty TimeRanges otherwise.
function makeVideo(opts: { currentTime: number; seekable?: [number, number]; duration?: number }) {
  const video = document.createElement('video');
  Object.defineProperty(video, 'currentTime', { value: opts.currentTime, writable: true });
  Object.defineProperty(video, 'duration', { value: opts.duration ?? Infinity, writable: true });
  const range = opts.seekable;
  Object.defineProperty(video, 'seekable', {
    value: {
      length: range ? 1 : 0,
      start: () => range?.[0] ?? 0,
      end: () => range?.[1] ?? 0,
    },
    writable: true,
  });
  return video;
}

function renderControls(
  video: HTMLVideoElement,
  overrides: Partial<Parameters<typeof useTransportControls>[0]> = {},
) {
  const videoRef = { current: video } as RefObject<HTMLVideoElement | null>;
  return renderHook(
    (props: Partial<Parameters<typeof useTransportControls>[0]>) =>
      useTransportControls({ videoRef, mode: 'live', isTimeSource: true, ...props }),
    { initialProps: overrides },
  );
}

const hlsWith = (liveSyncPosition: number | null) =>
  ({ current: { liveSyncPosition } } as unknown as RefObject<Hls | null>);

describe('useTransportControls — live DVR progress', () => {
  it('reports the seekable window and hls.js live sync position', () => {
    const onProgress = vi.fn();
    const video = makeVideo({ currentTime: 1200, seekable: [60, 3606] });
    renderControls(video, { onProgress, hlsRef: hlsWith(3600) });

    fireEvent(video, new Event('timeupdate'));
    expect(onProgress).toHaveBeenCalledWith(1200, 3606, {
      start: 60,
      edge: 3600,
      tolerance: LIVE_EDGE_TOLERANCE_SEC,
    });
  });

  it('falls back to the seekable end and a wider tolerance with no hls instance (Safari native)', () => {
    const onProgress = vi.fn();
    const video = makeVideo({ currentTime: 3600, seekable: [0, 3606] });
    renderControls(video, { onProgress });

    fireEvent(video, new Event('timeupdate'));
    expect(onProgress).toHaveBeenCalledWith(3600, 3606, {
      start: 0,
      edge: 3606,
      tolerance: NATIVE_LIVE_EDGE_TOLERANCE_SEC,
    });
  });

  it('reports nothing while nothing is seekable yet', () => {
    const onProgress = vi.fn();
    const video = makeVideo({ currentTime: 0 });
    renderControls(video, { onProgress, hlsRef: hlsWith(10) });

    fireEvent(video, new Event('timeupdate'));
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('applies a live seek command, and a new token re-applies the same time', () => {
    const video = makeVideo({ currentTime: 3600, seekable: [0, 3606] });
    const { rerender } = renderControls(video, { seekCommand: { time: 1200, token: 1 } });
    expect(video.currentTime).toBe(1200);

    video.currentTime = 1500;
    rerender({ seekCommand: { time: 1200, token: 2 } });
    expect(video.currentTime).toBe(1200);
  });
});

describe('useTransportControls — replay progress is unchanged', () => {
  it('reports duration and no live window', () => {
    const onProgress = vi.fn();
    const video = makeVideo({ currentTime: 42, duration: 300, seekable: [0, 300] });
    renderControls(video, { mode: 'replay', onProgress });

    fireEvent(video, new Event('timeupdate'));
    expect(onProgress).toHaveBeenCalledWith(42, 300);
  });
});

describe('useTransportControls — resuming a paused live stream', () => {
  /**
   * O caso que motivou a recuperação: a janela deslizante andou enquanto o
   * viewer ficou pausado, e a posição dele agora aponta para segmentos que o
   * servidor já descartou. Retomar dali trava o player sem erro nenhum.
   */
  it('jumps to the live edge when the DVR window has slid past the position', () => {
    const video = makeVideo({ currentTime: 100, seekable: [900, 4200] });
    const play = vi.spyOn(video, 'play').mockResolvedValue(undefined);

    const { rerender } = renderControls(video, { paused: true, hlsRef: hlsWith(4180) });
    rerender({ paused: false, hlsRef: hlsWith(4180) });

    expect(video.currentTime).toBe(4180);
    expect(play).toHaveBeenCalled();
  });

  it('falls back to the seekable end when there is no hls instance (Safari native)', () => {
    const video = makeVideo({ currentTime: 100, seekable: [900, 4200] });
    vi.spyOn(video, 'play').mockResolvedValue(undefined);

    const { rerender } = renderControls(video, { paused: true });
    rerender({ paused: false });

    expect(video.currentTime).toBe(4200);
  });

  /**
   * Uma pausa curta continua sendo um rewind de DVR legítimo. Arrastar o
   * viewer de volta ao vivo aqui seria roubar a posição que ele escolheu.
   */
  it('leaves a position that is still inside the window alone', () => {
    const video = makeVideo({ currentTime: 1200, seekable: [900, 4200] });
    vi.spyOn(video, 'play').mockResolvedValue(undefined);

    const { rerender } = renderControls(video, { paused: true, hlsRef: hlsWith(4180) });
    rerender({ paused: false, hlsRef: hlsWith(4180) });

    expect(video.currentTime).toBe(1200);
  });

  /** Replay é uma timeline fixa: não existe janela para sair. */
  it('never repositions a replay', () => {
    const video = makeVideo({ currentTime: 100, seekable: [900, 4200], duration: 4200 });
    vi.spyOn(video, 'play').mockResolvedValue(undefined);

    const { rerender } = renderControls(video, { mode: 'replay', paused: true });
    rerender({ mode: 'replay', paused: false });

    expect(video.currentTime).toBe(100);
  });

  it('pauses the element without touching the position', () => {
    const video = makeVideo({ currentTime: 100, seekable: [900, 4200] });
    const pause = vi.spyOn(video, 'pause').mockImplementation(() => {});

    renderControls(video, { paused: true, hlsRef: hlsWith(4180) });

    expect(pause).toHaveBeenCalled();
    expect(video.currentTime).toBe(100);
  });
});

describe('useTransportControls — painel que ainda carregava quando o play começou', () => {
  /**
   * O bug relatado. O CameraGrid monta um painel para TODA câmera do palco
   * desde o carregamento, então dar play com várias ainda baixando manifest
   * fazia o play() rejeitar nelas. A rejeição era engolida e ninguém tentava de
   * novo: a principal tocava, as outras ficavam mudas até serem promovidas.
   */
  it('retries once the element reports it can play', async () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    // Primeira tentativa falha, como um elemento sem dados ainda.
    const play = vi
      .spyOn(video, 'play')
      .mockRejectedValueOnce(new Error('not ready'))
      .mockResolvedValue(undefined);

    renderControls(video, { mode: 'replay', paused: false });
    await Promise.resolve();
    expect(play).toHaveBeenCalledTimes(1);

    fireEvent(video, new Event('canplay'));

    expect(play).toHaveBeenCalledTimes(2);
  });

  it('stops retrying once playback is paused again', () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    vi.spyOn(video, 'pause').mockImplementation(() => {});
    const play = vi.spyOn(video, 'play').mockResolvedValue(undefined);

    const { rerender } = renderControls(video, { mode: 'replay', paused: false });
    play.mockClear();

    rerender({ mode: 'replay', paused: true });
    fireEvent(video, new Event('canplay'));

    expect(play).not.toHaveBeenCalled();
  });

  /** Elemento que já toca: repetir play() é no-op, mas não pode explodir. */
  it('is harmless when canplay fires on an element already playing', () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    const play = vi.spyOn(video, 'play').mockResolvedValue(undefined);

    renderControls(video, { mode: 'replay', paused: false });
    fireEvent(video, new Event('canplay'));
    fireEvent(video, new Event('canplay'));

    expect(play).toHaveBeenCalledTimes(3);
  });
});

describe('useTransportControls — diagnóstico de play', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => warn.mockRestore());

  const playing = (video: HTMLVideoElement) =>
    renderControls(video, { mode: 'replay', paused: false, cameraId: 'cam-b' });

  it('names the camera that failed, which is the first thing one wants to know', async () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    vi.spyOn(video, 'play').mockRejectedValue(new Error('boom'));

    playing(video);
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[play-failed]'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('camera=cam-b'));
  });

  /**
   * AbortError é play() interrompido por pause() ou por um load novo — rotina
   * do ciclo do player. Logar afogaria o sinal que importa.
   */
  it('stays quiet on an aborted play', async () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    vi.spyOn(video, 'play').mockRejectedValue(
      new DOMException('interrupted', 'AbortError'),
    );

    playing(video);
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).not.toHaveBeenCalled();
  });

  /** "Falhou e depois tocou" é outra história que "nunca tocou". */
  it('reports that a retry recovered, and after how many attempts', async () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    vi.spyOn(video, 'play')
      .mockRejectedValueOnce(new Error('not ready'))
      .mockResolvedValue(undefined);

    playing(video);
    await Promise.resolve();
    await Promise.resolve();

    fireEvent(video, new Event('canplay'));
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[play-recovered]'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('afterAttempts=1'));
  });

  it('says nothing when playback starts on the first try', async () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    vi.spyOn(video, 'play').mockResolvedValue(undefined);

    playing(video);
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).not.toHaveBeenCalled();
  });
});

describe('useTransportControls — cobertura julgada pela posição, não pelo último seek', () => {
  // Câmera que só entra aos 60s do evento.
  const LATE: ReplaySegmentCoverage[] = [
    { startsAtMs: 60_000, endsAtMs: 180_000, localStartSec: 0 },
  ];

  const play = (video: HTMLVideoElement) => vi.spyOn(video, 'play').mockResolvedValue(undefined);

  it('refuses to play while the current instant is before this camera joined', () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    const spy = play(video);

    const { result } = renderControls(video, {
      mode: 'replay', paused: false, coverage: LATE, positionMs: 10_000,
    });

    expect(result.current.outsideCoverage).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  /**
   * O bug relatado. A reprodução AVANÇA sozinha, sem emitir seek nenhum. Ao
   * derivar do seekCommand, o painel ficava preso no veredito de um instante já
   * passado e a câmera nunca voltava a tocar — nem ao ser adicionada ao grid.
   */
  it('starts playing on its own once playback advances into coverage', () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    const spy = play(video);

    const { result, rerender } = renderControls(video, {
      mode: 'replay', paused: false, coverage: LATE, positionMs: 10_000,
    });
    expect(spy).not.toHaveBeenCalled();

    // Nenhum seek: só o tempo passando.
    rerender({ mode: 'replay', paused: false, coverage: LATE, positionMs: 61_000 });

    expect(result.current.outsideCoverage).toBe(false);
    expect(spy).toHaveBeenCalled();
  });

  it('goes back to the placeholder when playback leaves coverage again', () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    play(video);
    vi.spyOn(video, 'pause').mockImplementation(() => {});

    const { result, rerender } = renderControls(video, {
      mode: 'replay', paused: false, coverage: LATE, positionMs: 61_000,
    });
    expect(result.current.outsideCoverage).toBe(false);

    rerender({ mode: 'replay', paused: false, coverage: LATE, positionMs: 200_000 });

    expect(result.current.outsideCoverage).toBe(true);
  });

  /** Antes do primeiro progresso chegar, o seek comandado é o que se tem. */
  it('falls back to the commanded seek before any position is reported', () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    play(video);

    const { result } = renderControls(video, {
      mode: 'replay', paused: false, coverage: LATE,
      seekCommand: { time: 10_000, token: 1 },
    });

    expect(result.current.outsideCoverage).toBe(true);
  });
});

describe('useTransportControls — quem pausou', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => warn.mockRestore());

  /**
   * Enquanto o estado diz "tocando", um `pause` no elemento veio de fora do
   * nosso código. Sem registrar, "a câmera parou" e "a câmera nunca começou"
   * caem no mesmo balde — foi o que travou o diagnóstico da troca de áudio.
   */
  it('reports a pause that our own state did not ask for', () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    vi.spyOn(video, 'play').mockResolvedValue(undefined);

    renderControls(video, { mode: 'live', paused: false, cameraId: 'cam-a' });
    fireEvent(video, new Event('pause'));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[paused-externally]'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('camera=cam-a'));
  });

  /** Pausa pedida por nós não é anomalia: o listener sai antes. */
  it('says nothing when the pause is the one we commanded', () => {
    const video = makeVideo({ currentTime: 0, seekable: [0, 600], duration: 600 });
    vi.spyOn(video, 'play').mockResolvedValue(undefined);
    vi.spyOn(video, 'pause').mockImplementation(() => {});

    const { rerender } = renderControls(video, { mode: 'live', paused: false, cameraId: 'cam-a' });
    warn.mockClear();

    rerender({ mode: 'live', paused: true, cameraId: 'cam-a' });
    fireEvent(video, new Event('pause'));

    expect(warn).not.toHaveBeenCalled();
  });
});
