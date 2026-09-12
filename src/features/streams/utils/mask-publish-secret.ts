// Masks the per-camera publish secret embedded in the SRT ingest URL (R1
// format: streamid=publish:<streamKey>:publisher:<publishSecret>) so the
// dashboard credentials panel never displays it in the clear. Old-format
// URLs (no :publisher: segment) have nothing to mask and pass through as-is.
const PUBLISH_SECRET = /(streamid=publish:[^:&]+:[^:&]+:)[^&]+/;

export function maskPublishSecret(url: string): string {
  return url.replace(PUBLISH_SECRET, '$1••••••••');
}
