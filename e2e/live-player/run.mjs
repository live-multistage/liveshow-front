// Real hls.js, real Chrome, the real CameraGrid and hooks, synthetic HLS.
//   pnpm test:e2e:player              every scenario
//   pnpm test:e2e:player a1 a4        only these
// Needs ffmpeg and Google Chrome: Playwright's bundled Chromium has no H.264/AAC.
// Exits 1 if a scenario's assertion fails. `offset90*` only record what happens.
import { chromium } from 'playwright-core';
import { buildHarness } from './build.mjs';
import { ensureMedia } from './media.mjs';
import { startServer } from './server.mjs';

const PORT = Number(process.env.E2E_PORT ?? 18765);
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sampler = () => {
  const ranges = (b) => Array.from({ length: b.length }, (_, i) => [+b.start(i).toFixed(1), +b.end(i).toFixed(1)]);
  const cameraIds = window.__h.shell.stageCameras.map((c) => c.cameraId);
  const videos = [...document.querySelectorAll('video')].map((v, i) => {
    const ms = window.__ms.get(v.src);
    const hls = window.__hlsOf.get(v);
    return {
      targetLatency: hls?.targetLatency ?? null,
      catchUp: hls ? hls.config.liveMaxLatencyDurationCount : null,
      liveSync: hls?.liveSyncPosition ?? null,
      // Wall-clock distance from live of what is on screen (PROGRAM-DATE-TIME).
      behindLiveSec: hls?.playingDate ? +((Date.now() - hls.playingDate.getTime()) / 1000).toFixed(1) : null,
      camera: cameraIds[i],
      focused: v.dataset.focused,
      ct: +v.currentTime.toFixed(2),
      paused: v.paused,
      rs: v.readyState,
      buffered: ranges(v.buffered),
      sourceBuffers: ms?.__sbs?.map(({ t, sb }) => {
        try {
          return `${t.slice(0, 5)}${JSON.stringify(ranges(sb.buffered))}`;
        } catch {
          return `${t.slice(0, 5)}:removed`;
        }
      }),
    };
  });
  const text = document.body.innerText;
  return {
    videos,
    behindBadge: !!document.querySelector('[data-badge] button'),
    connecting: text.includes('CONECTANDO'),
    lost: text.includes('SINAL PERDIDO'),
  };
};

async function withPage(scenario, fn, before) {
  const server = await startServer(PORT);
  before?.(server);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 700 } })).newPage();
  const logs = [];
  page.on('console', (m) => logs.push(m.text()));
  page.on('pageerror', (e) => logs.push(`pageerror ${e.message}`));
  try {
    await page.goto(`${BASE}/?sc=${scenario}`);
    return await fn({ page, server, logs, sample: () => page.evaluate(sampler) });
  } catch (e) {
    console.log(logs.slice(-15).join('\n'));
    throw e;
  } finally {
    await browser.close();
    await server.close();
  }
}

const panel = (sample, camera) => sample.videos.find((v) => v.camera === camera);
const isPlaying = (v) => !!v && v.rs >= 2 && v.ct > 0 && !v.paused;

// Samples every 2 s from the switch to stage B, for `seconds`.
async function timelineAfterSwitch({ page, sample }, seconds) {
  await sleep(8000);
  await page.click("button[data-stage=sB]", { timeout: 5000 });
  const timeline = [];
  for (let t = 2; t <= seconds; t += 2) {
    await sleep(2000);
    timeline.push({ t, ...(await sample()) });
  }
  return timeline;
}

const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};

async function advancing(sample, camera) {
  const before = panel(await sample(), camera);
  await sleep(3000);
  const after = panel(await sample(), camera);
  return isPlaying(after) && after.ct > before.ct;
}

const brief = (timeline, camera) =>
  timeline.map((s) => {
    const v = panel(s, camera);
    return `t+${s.t} ct=${v?.ct} rs=${v?.rs} badge=${s.behindBadge} ${v?.sourceBuffers?.join(' ') ?? ''}`;
  });

// Share of `seconds` during which `camera` was playing but its picture didn't
// move, counted from its first frame.
async function frozenShare(sample, camera, seconds) {
  let last = null;
  let frozen = 0;
  let counted = 0;
  for (let i = 0; i < seconds; i++) {
    await sleep(1000);
    const v = panel(await sample(), camera);
    if (v && last !== null && !v.paused && last > 0) {
      counted += 1;
      if (Math.abs(v.ct - last) < 0.05) frozen += 1;
    }
    last = v?.ct ?? null;
  }
  return counted ? frozen / counted : 1;
}

const activate = (page, camera) =>
  page.evaluate((id) => {
    if (!window.__h.shell.activeCameraIds.includes(id)) window.__h.shell.toggleCamera(id);
  }, camera);

const SUITE = {
  // A1 + badge: main panel whose tracks don't overlap must start, and the badge
  // must not say "behind" while it hasn't.
  a1: () =>
    withPage('ahead20', async (ctx) => {
      const camera = 'ahead20-b1';
      const timeline = await timelineAfterSwitch(ctx, 40);
      console.log(brief(timeline, camera).join('\n'));
      const notStarted = timeline.filter((s) => !isPlaying(panel(s, camera)) && panel(s, camera)?.ct === 0);
      assert(notStarted.every((s) => !s.behindBadge), 'badge said "behind" before playback started');
      assert(await advancing(ctx.sample, camera), 'main panel never started playing');
      assert(ctx.logs.some((l) => l.includes('[hls-start-watchdog]')), 'watchdog logged nothing');
    }),

  // A2: a stuck master must not drag its follower to the start of the DVR.
  a2: () =>
    withPage('ahead20', async (ctx) => {
      const timeline = await timelineAfterSwitch(ctx, 20);
      const follower = timeline.map((s) => panel(s, 'ok-b2')?.ct ?? null).filter((ct) => ct !== null);
      const segments = ctx.server.stats['ok-b2']?.seg_v ?? 0;
      console.log(`follower ct=${follower.join(',')} video segments=${segments}`);
      assert(segments < 100, `follower downloaded ${segments} video segments`);
      assert(follower.every((ct) => ct === 0 || ct > 200), 'follower was dragged towards the DVR start');
    }),

  // A4: a master 404 at startup must be requested again.
  a4: () =>
    withPage('m404', async (ctx) => {
      const camera = 'm404x2-b1';
      const timeline = await timelineAfterSwitch(ctx, 20);
      console.log(brief(timeline, camera).join('\n'));
      console.log(JSON.stringify(ctx.server.stats[camera]));
      assert(ctx.server.stats[camera].master >= 3, 'master was not requested again');
      assert(await advancing(ctx.sample, camera), 'panel never started playing');
      assert(!(await ctx.sample()).connecting, '"connecting" still covers the panel');
    }),

  // A5: after a fatal network drop, "connecting" must clear once video returns.
  a5: () =>
    withPage('flap', async ({ server, sample }) => {
      await sleep(10000);
      server.setDown('flap-a1', true);
      await sleep(25000);
      server.setDown('flap-a1', false);
      await sleep(25000);
      const s = await sample();
      console.log(JSON.stringify(s));
      assert(isPlaying(panel(s, 'flap-a1')), 'panel did not resume');
      assert(!s.connecting, '"connecting" still covers the panel');
    }),

  // A3: an expired token must recover once the poll delivers a new one.
  a3: () =>
    withPage('ttl', async ({ page, sample, server }) => {
      await sleep(8000);
      await page.evaluate(() => { window.__pollOff = true; });
      await sleep(35000);
      const dead = await sample();
      console.log('poll off', JSON.stringify(dead), JSON.stringify(server.stats['ttl15-a1']));
      await page.evaluate(() => { window.__pollOff = false; });
      await sleep(15000);
      const s = await sample();
      console.log('poll back', JSON.stringify(s));
      assert(!s.lost, '"no signal" still shown after a fresh token');
      assert(await advancing(sample, 'ttl15-a1'), 'panel did not resume');
    }),

  // F1: an 11 s GOP under TARGETDURATION:2, as the main panel and as a follower
  // of a regular main. This origin doesn't reproduce the freeze measured on the
  // back's own playlists (47% and ~90% frozen), so the deciding assertions are
  // on what hls.js was told; the frozen share is a guard.
  f1: () =>
    withPage('gop11', async ({ page, sample }) => {
      await activate(page, 'ok-a2');
      await sleep(10000);
      const main = await frozenShare(sample, 'gop11-a1', 30);
      const a = await sample();
      await page.click('button[data-stage=sB]', { timeout: 5000 });
      await sleep(3000);
      await activate(page, 'gop11-b2');
      await sleep(10000);
      const follower = await frozenShare(sample, 'gop11-b2', 30);
      const b = await sample();
      const of = (s, camera) => panel(s, camera) ?? {};
      console.log(`frozen main=${(main * 100).toFixed(0)}% follower=${(follower * 100).toFixed(0)}%`);
      console.log(JSON.stringify([of(a, 'gop11-a1'), of(a, 'ok-a2'), of(b, 'ok-b1'), of(b, 'gop11-b2')].map(({ camera, targetLatency, catchUp, ct, liveSync }) => ({ camera, targetLatency, catchUp, ct, liveSync }))));
      assert(of(a, 'gop11-a1').targetLatency >= 16.5, 'long-GOP main kept the 2 s-GOP latency target');
      assert(of(a, 'gop11-a1').catchUp >= 14, 'long-GOP main would be yanked forward by the catch-up');
      assert(of(b, 'gop11-b2').targetLatency >= 16.5, 'long-GOP follower kept the 2 s-GOP latency target');
      assert(of(a, 'ok-a2').targetLatency === 6 && of(b, 'ok-b1').targetLatency === 6, 'a 2 s GOP lost its latency target');
      assert(main < 0.15 && follower < 0.2, 'long-GOP panel froze');
    }),

  // F2: a held panel (audio 92 s late) must keep playing when sent to the edge,
  // demoted to a follower and promoted back. Before the fix it froze in each.
  f2: () =>
    withPage('behind46', async ({ page, sample }) => {
      const camera = 'behind46-b1';
      await sleep(8000);
      await page.click('button[data-stage=sB]', { timeout: 5000 });
      await sleep(2000);
      await activate(page, 'ok-b2');
      await page.evaluate((id) => window.__h.shell.handleMainCameraChange(id), camera);
      await sleep(15000);
      assert(await advancing(sample, camera), 'held panel is not playing');
      await page.click('[data-badge] button', { timeout: 20000 });
      const afterLive = await frozenShare(sample, camera, 20);
      console.log(`after "live": frozen ${(afterLive * 100).toFixed(0)}%`, JSON.stringify(panel(await sample(), camera)));
      assert(await advancing(sample, camera), 'held panel froze after "live"');
      await page.evaluate(() => window.__h.shell.handleMainCameraChange('ok-b2'));
      await sleep(10000);
      assert(await advancing(sample, camera), 'held panel froze as a follower');
      await page.evaluate((id) => window.__h.shell.handleMainCameraChange(id), camera);
      await sleep(10000);
      const promoted = await frozenShare(sample, camera, 10);
      console.log(`promoted back: frozen ${(promoted * 100).toFixed(0)}%`, JSON.stringify(panel(await sample(), camera)));
      assert(promoted < 0.3, 'held panel froze when promoted back');
    }),

  // F2: once the tracks meet at the edge again, "live" lifts the hold: back at
  // the edge, catch-up on, clock shared again.
  f2realign: () =>
    withPage('behind46', async ({ page, sample, server }) => {
      const camera = 'behind46-b1';
      await sleep(8000);
      await page.click('button[data-stage=sB]', { timeout: 5000 });
      await sleep(2000);
      await activate(page, 'ok-b2');
      await page.evaluate((id) => window.__h.shell.handleMainCameraChange(id), camera);
      await sleep(15000);
      const before = await sample();
      const held = panel(before, camera);
      console.log('held', JSON.stringify({ badge: before.behindBadge, ct: held.ct, rs: held.rs, liveSync: held.liveSync, catchUp: String(held.catchUp) }));
      assert(held.catchUp === Infinity, 'panel was not held');
      server.realign(camera);
      await page.click('[data-badge] button', { timeout: 20000 });
      await sleep(15000);
      const s = await sample();
      const v = panel(s, camera);
      console.log(JSON.stringify({ held: { ct: held.ct, liveSync: held.liveSync }, now: v, follower: panel(s, 'ok-b2')?.ct }));
      assert(v.catchUp === 8, 'hold not lifted: catch-up still off');
      assert(v.liveSync - v.ct <= 8, 'panel did not return to the edge');
      assert(Math.abs(panel(s, 'ok-b2').ct - v.ct) < 2, 'follower is not sharing the clock again');
      assert(await advancing(sample, camera), 'panel is not playing at the edge');
    }),

  // F3: an origin down for 90 s (a deploy) in mid-show, and one down for the
  // first 100 s of a viewer's session (past the fast retries). Both must come back on their own.
  f3drop: () =>
    withPage('flap', async ({ server, sample }) => {
      await sleep(10000);
      server.setDown('flap-a1', true);
      await sleep(90000);
      server.setDown('flap-a1', false);
      await sleep(30000);
      const s = await sample();
      console.log(JSON.stringify({ lost: s.lost, connecting: s.connecting, v: panel(s, 'flap-a1') }));
      assert(!s.lost && !s.connecting, '"no signal" still shown after the origin came back');
      assert(await advancing(sample, 'flap-a1'), 'panel did not resume after a 90 s drop');
    }),
  f3boot: () =>
    withPage(
      'flap',
      async ({ server, sample }) => {
        await sleep(100000);
        const down = await sample();
        server.setDown('flap-a1', false);
        await sleep(30000);
        const s = await sample();
        console.log(JSON.stringify({ whileDown: { lost: down.lost, connecting: down.connecting }, lost: s.lost, connecting: s.connecting }));
        assert(down.lost || down.connecting, 'a dead origin looked healthy');
        assert(!s.lost && !s.connecting, 'panel did not recover from an origin down at boot');
        assert(await advancing(sample, 'flap-a1'), 'panel never started after the origin came up');
      },
      (server) => server.setDown('flap-a1', true),
    ),

  // F4: a token that expires while the viewer sits 60 s back in the DVR must not
  // throw them to the live edge when hls is rebuilt.
  f4: () =>
    withPage('ttl', async ({ page, sample }) => {
      const camera = 'ttl15-a1';
      await sleep(10000);
      await page.evaluate(() => window.__h.handleSeek(window.__h.dvr.position - 60));
      await sleep(5000);
      const rewound = panel(await sample(), camera);
      await page.evaluate(() => { window.__pollOff = true; });
      await sleep(30000);
      await page.evaluate(() => { window.__pollOff = false; });
      await sleep(15000);
      const s = await sample();
      const v = panel(s, camera);
      console.log(JSON.stringify({ rewound: rewound.behindLiveSec, now: v.behindLiveSec, lost: s.lost, catchUp: String(v.catchUp), dvrSeeking: await page.evaluate(() => window.__h.dvrSeeking) }));
      assert(!s.lost, 'still "no signal" after a fresh token');
      assert(await advancing(sample, camera), 'panel did not resume');
      // Paused while dead (~30 s) plus playing on: never closer to live than when rewound.
      assert(v.behindLiveSec >= rewound.behindLiveSec - 5, `thrown to live: ${v.behindLiveSec} s behind, was ${rewound.behindLiveSec}`);
      assert(v.catchUp === Infinity, 'rebuilt instance lost the DVR catch-up');
    }),

  // Audio ~90 s against video, the sign measured on the Pepsi camera is "behind".
  // Record only: whether it plays is the result, not a pass/fail.
  offset90behind: () => recordOffset('behind46'),
  offset90ahead: () => recordOffset('ahead46'),
};

function recordOffset(scenario) {
  const camera = `${scenario}-b1`;
  return withPage(scenario, async (ctx) => {
    const timeline = await timelineAfterSwitch(ctx, 130);
    console.log(brief(timeline, camera).join('\n'));
    console.log('follower', timeline.map((s) => panel(s, 'ok-b2')?.ct).join(','));
    console.log(JSON.stringify(ctx.server.stats));
    console.log(ctx.logs.filter((l) => l.includes('[hls-start-watchdog]')).join('\n'));
    console.log(`RESULT ${scenario}: ${(await advancing(ctx.sample, camera)) ? 'playing' : 'NOT playing'}`);
  });
}

const selected = process.argv.slice(2).filter((a) => a !== '--');
ensureMedia();
await buildHarness(process.env.PLAYER_SRC);
let failed = 0;
for (const name of selected.length ? selected : Object.keys(SUITE)) {
  console.log(`\n=== ${name}`);
  try {
    await SUITE[name]();
    console.log(`PASS ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL ${name}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
