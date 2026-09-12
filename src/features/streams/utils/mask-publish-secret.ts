// Masks the per-camera publish secret embedded in the SRT ingest URL (R1
// format: streamid=publish:<streamKey>:publisher:<publishSecret>) so the
// dashboard credentials panel never displays it in the clear. Old-format
// URLs (no :publisher: segment) have nothing to mask and pass through as-is.
const PUBLISH_SECRET = /(streamid=publish:[^:&]+:[^:&]+:)[^&]+/;
const PUBLISHER_MARKER = ':publisher:';

export function maskPublishSecret(url: string): string {
  const masked = url.replace(PUBLISH_SECRET, '$1••••••••');
  if (masked !== url) return masked;

  // Fail closed: the URL claims to carry a publish secret (":publisher:" is
  // present) but the regex above didn't recognize its shape — e.g. a
  // percent-encoded or otherwise malformed variant. Rather than risk
  // displaying an unmasked secret we don't understand, blank out everything
  // after the marker.
  const markerIndex = url.indexOf(PUBLISHER_MARKER);
  if (markerIndex === -1) return url;
  return url.slice(0, markerIndex + PUBLISHER_MARKER.length) + '••••••••';
}
