// Synthetic live origin: 5 min of DVR, alternate audio and PROGRAM-DATE-TIME in
// the backend's shape. A camera's name selects its failure:
//   ahead<N>-*   audio segment K holds the media of K+N (audio PTS ahead of video)
//   behind<N>-*  audio segment K holds the media of K-N (audio PTS behind video)
//   m404x<N>-*   the first N master requests return 404
//   ttl<S>-*     a pt older than S seconds gets 401
//   gop11-*      video in 11 s segments (one GOP each) under TARGETDURATION:2
//   flap-*       every request returns 404 while switched down through /ctl
//   offline-*    no manifestPath
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LONG_GOP_SEC, MEDIA_DIR } from './media.mjs';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '.dist');
const SEGMENT_SEC = 2;
const DVR_MS = 300_000;

export const SCENARIOS = {
  base: [['A', ['ok-a1', 'ok-a2']], ['B', ['ok-b1', 'ok-b2']]],
  ahead20: [['A', ['ok-a1']], ['B', ['ahead20-b1', 'ok-b2']]],
  ahead46: [['A', ['ok-a1']], ['B', ['ahead46-b1', 'ok-b2']]],
  behind46: [['A', ['ok-a1']], ['B', ['behind46-b1', 'ok-b2']]],
  m404: [['A', ['ok-a1']], ['B', ['m404x2-b1']]],
  flap: [['A', ['flap-a1', 'ok-a2']]],
  ttl: [['A', ['ttl15-a1', 'ok-a2']]],
  gop11: [['A', ['gop11-a1', 'ok-a2']], ['B', ['ok-b1', 'gop11-b2']]],
};

const num = (camera, prefix) => Number(camera.match(new RegExp(`^${prefix}(\\d+)`))?.[1] ?? 0);

export function startServer(port) {
  const t0 = Date.now() - DVR_MS;
  const stats = {};
  const minted = new Map();
  const down = new Set();
  const shiftOverride = new Map();
  let tokens = 0;
  const hit = (camera, key) => {
    stats[camera] ??= {};
    stats[camera][key] = (stats[camera][key] ?? 0) + 1;
    return stats[camera][key];
  };
  const lastSegment = () => Math.floor((Date.now() - t0) / 1000 / SEGMENT_SEC) - 1;

  const playback = (scenario) => {
    tokens += 1;
    const pt = `t${tokens}`;
    minted.set(pt, Date.now());
    const stages = SCENARIOS[scenario].map(([name, cameras], position) => ({
      stageId: `s${name}`,
      name: `Stage${name}`,
      slug: name,
      position,
      cameras: cameras.map((cameraId, priority) => ({
        cameraId,
        name: cameraId,
        slug: cameraId,
        priority,
        manifestPath: cameraId.startsWith('offline') ? null : `/api/packages/${cameraId}/live/master.m3u8?pt=${pt}`,
        llPath: null,
        live: !cameraId.startsWith('offline'),
        thumbnailUrl: null,
      })),
    }));
    const cameras = stages.flatMap((s) => s.cameras);
    const primaryCameraId = cameras[0].cameraId;
    return {
      eventId: 'e',
      live: true,
      latencyMode: 'STANDARD',
      streams: [{ id: 'st', title: 'T', position: 0, live: true, stages, cameras, primaryCameraId, librasCameraId: null }],
      defaultStreamId: 'st',
      lockedStreams: [],
      stages,
      cameras,
      primaryCameraId,
      librasCameraId: null,
    };
  };

  const master = (camera, pt) =>
    [
      '#EXTM3U',
      '#EXT-X-VERSION:7',
      `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="${camera}",DEFAULT=YES,AUTOSELECT=YES,URI="/api/packages/${camera}/dvr/a.m3u8?pt=${pt}"`,
      '#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=320x180,CODECS="avc1.4d400d,mp4a.40.2",AUDIO="a"',
      `/api/packages/${camera}/dvr/v.m3u8?pt=${pt}`,
      '',
    ].join('\n');

  const playlist = (camera, kind, pt) => {
    const sec = kind === 'v' && camera.startsWith('gop11') ? LONG_GOP_SEC : SEGMENT_SEC;
    // A segment is listed once it has closed; the declared target stays nominal.
    const closed = sec === SEGMENT_SEC ? lastSegment() : Math.floor((Date.now() - t0) / 1000 / sec);
    const lines = ['#EXTM3U', '#EXT-X-VERSION:7', `#EXT-X-TARGETDURATION:${SEGMENT_SEC}`, '#EXT-X-MEDIA-SEQUENCE:0'];
    for (let i = 0; i < closed; i++) {
      lines.push(`#EXT-X-PROGRAM-DATE-TIME:${new Date(t0 + i * sec * 1000).toISOString()}`);
      lines.push(`#EXTINF:${sec.toFixed(3)},`);
      lines.push(`/api/packages/${camera}/dvr/${kind}/segment_${String(i).padStart(5, '0')}.ts?pt=${pt}`);
    }
    return `${lines.join('\n')}\n`;
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const route = url.pathname;
    const pt = url.searchParams.get('pt');
    const send = (code, type, body) => {
      res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(body);
    };

    if (route === '/playback.json') return send(200, 'application/json', JSON.stringify(playback(url.searchParams.get('sc'))));

    const camera = route.match(/^\/api\/packages\/([^/]+)\//)?.[1];
    if (camera) {
      const ttl = num(camera, 'ttl');
      if (ttl && Date.now() - (minted.get(pt) ?? 0) > ttl * 1000) {
        hit(camera, '401');
        return send(401, 'text/plain', 'expired');
      }
      if (route.endsWith('/live/master.m3u8')) {
        const count = hit(camera, 'master');
        if (down.has(camera) || count <= num(camera, 'm404x')) return send(404, 'text/plain', 'nope');
        return send(200, 'application/vnd.apple.mpegurl', master(camera, pt));
      }
      const pl = route.match(/\/dvr\/([av])\.m3u8$/);
      if (pl) {
        hit(camera, `pl_${pl[1]}`);
        if (down.has(camera)) return send(404, 'text/plain', 'nope');
        return send(200, 'application/vnd.apple.mpegurl', playlist(camera, pl[1], pt));
      }
      const seg = route.match(/\/dvr\/([av])\/segment_(\d+)\.ts$/);
      if (seg) {
        const [, kind, n] = seg;
        hit(camera, `seg_${kind}`);
        if (down.has(camera)) return send(404, 'text/plain', 'nope');
        const named = num(camera, 'ahead') - num(camera, 'behind');
        const shift = kind === 'a' ? (shiftOverride.get(camera) ?? named) : 0;
        const prefix = kind === 'v' && camera.startsWith('gop11') ? 'g' : kind;
        const file = path.join(MEDIA_DIR, `${prefix}_${String(Number(n) + shift).padStart(5, '0')}.ts`);
        if (!fs.existsSync(file)) return send(404, 'text/plain', 'gone');
        res.writeHead(200, { 'content-type': 'video/mp2t' });
        return fs.createReadStream(file).pipe(res);
      }
    }

    const file = path.join(DIST, route === '/' ? 'index.html' : route);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(404, 'text/plain', 'x');
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
    return send(200, type, fs.readFileSync(file));
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () =>
      resolve({
        stats,
        setDown: (camera, isDown) => (isDown ? down.add(camera) : down.delete(camera)),
        // The camera's audio realigns with its video from the next request on.
        realign: (camera) => shiftOverride.set(camera, 0),
        close: () => new Promise((done) => { server.closeAllConnections(); server.close(done); }),
      }),
    );
  });
}
