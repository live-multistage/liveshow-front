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
    return {
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

async function withPage(scenario, fn) {
  const server = await startServer(PORT);
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
