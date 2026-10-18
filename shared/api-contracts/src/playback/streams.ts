/**
 * Which transmission the player shows. The viewer's pick wins while it is
 * still granted; otherwise the server's default; otherwise the first. Null
 * only when there is nothing to show. Pure so web and mobile agree on the
 * fallback when a stream disappears mid-session (ticket revoked, stream deleted).
 */
export function pickActiveStream<T extends { id: string }>(
  streams: readonly T[],
  chosenStreamId: string | null,
  defaultStreamId: string | null | undefined,
): T | null {
  return (
    streams.find((s) => s.id === chosenStreamId) ??
    streams.find((s) => s.id === defaultStreamId) ??
    streams[0] ??
    null
  );
}
