// Compact countdown/date formatting for the program card's next-episode block.

// "2D 4H" / "1H 20M" / "5D" / "12M" — locale-neutral, wrapped by the
// `series.inCountdown` message ("EM {value}").
export function formatCountdown(startsAt: string, now: Date = new Date()): string | null {
  const diffMs = new Date(startsAt).getTime() - now.getTime();
  if (Number.isNaN(diffMs) || diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return hours > 0 ? `${days}D ${hours}H` : `${days}D`;
  if (hours > 0) return minutes > 0 ? `${hours}H ${minutes}M` : `${hours}H`;
  return `${Math.max(minutes, 1)}M`;
}

// "QUI 28/08 · 17:00" in the series' own timezone.
export function formatEpisodeWhen(startsAt: string, timezone: string, locale = 'pt-BR'): string {
  const date = new Date(startsAt);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: timezone })
    .format(date)
    .replace('.', '')
    .toUpperCase();
  const dayMonth = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    timeZone: timezone,
  }).format(date);
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(date);
  return `${weekday} ${dayMonth} · ${time}`;
}
