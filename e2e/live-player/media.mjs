import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const MEDIA_DIR = path.join(here, '.media');
const SECONDS = 900;
export const LONG_GOP_SEC = 11;

// Separate 2 s audio and video TS segments on one continuous timeline, so a
// scenario can misalign them just by serving a different file number.
export function ensureMedia() {
  if (fs.existsSync(path.join(MEDIA_DIR, 'done')) && fs.existsSync(path.join(MEDIA_DIR, 'g_00000.ts'))) return;
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  const segment = (pattern) => [
    '-f', 'segment', '-segment_time', '2', '-segment_format', 'mpegts', path.join(MEDIA_DIR, pattern),
  ];
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `testsrc2=s=320x180:r=24:d=${SECONDS}`,
    '-f', 'lavfi', '-i', `sine=frequency=440:d=${SECONDS}`,
    '-map', '0:v', '-c:v', 'libx264', '-preset', 'ultrafast', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
    '-force_key_frames', 'expr:gte(t,n_forced*2)', '-t', String(SECONDS), ...segment('v_%05d.ts'),
    '-map', '1:a', '-c:a', 'aac', '-b:a', '64k', '-t', String(SECONDS), ...segment('a_%05d.ts'),
  ]);
  // Same picture with an 11 s GOP, cut on its keyframes: what a camera with a
  // long keyframe interval produces while the playlist still says
  // TARGETDURATION:2.
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'lavfi', '-i', `testsrc2=s=320x180:r=24:d=${SECONDS}`,
    '-c:v', 'libx264', '-preset', 'ultrafast', '-profile:v', 'main', '-pix_fmt', 'yuv420p',
    '-force_key_frames', `expr:gte(t,n_forced*${LONG_GOP_SEC})`, '-t', String(SECONDS),
    '-f', 'segment', '-segment_time', String(LONG_GOP_SEC), '-segment_format', 'mpegts', path.join(MEDIA_DIR, 'g_%05d.ts'),
  ]);
  fs.writeFileSync(path.join(MEDIA_DIR, 'done'), '');
}
