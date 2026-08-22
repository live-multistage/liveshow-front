// No existing helper in the codebase converts an arbitrary IANA timezone's
// wall clock to a UTC instant (ChannelForm/ProgramForm only ever go the other
// way: UTC -> local display). date-fns-tz isn't installed, so this is the
// standard Intl-based round-trip: guess the offset by formatting a candidate
// instant in the target zone, then correct for the difference. One
// correction pass is enough — a DST boundary can only move the offset by an
// hour, which the first guess already absorbs.
export function wallClockToUtcISOString(date: string, time: string, timeZone: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wallClockUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  const offsetMs = (instantMs: number) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(new Date(instantMs));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value ?? 0);
    const shownAsUtc = Date.UTC(
      part('year'),
      part('month') - 1,
      part('day'),
      part('hour') === 24 ? 0 : part('hour'),
      part('minute'),
      part('second'),
    );
    return shownAsUtc - instantMs;
  };

  const instantMs = wallClockUtcMs - offsetMs(wallClockUtcMs);
  return new Date(instantMs).toISOString();
}

// The inverse: an ISO instant read as wall-clock date/time in a timezone —
// used to prefill the recurrence editor when editing an existing series.
export function utcInstantToWallClock(
  isoInstant: string,
  timeZone: string,
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(isoInstant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const hour = part('hour') === '24' ? '00' : part('hour');
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${hour}:${part('minute')}` };
}
