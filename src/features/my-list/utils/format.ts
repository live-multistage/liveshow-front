const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

export function dayLabel(iso: string, locale: string): { day: string; month: string } {
  const date = new Date(iso);
  return {
    day: new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat(locale, { month: 'short' })
      .format(date)
      .replace('.', '')
      .toUpperCase(),
  };
}

export function timeLabel(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

export function dateLabel(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/**
 * "em 18 dias", "in 3 hours" — traduzido pelo próprio Intl, para não manter
 * uma tabela de plurais por idioma que já existe pronta na plataforma.
 */
export function countdownLabel(iso: string, locale: string, now: Date = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const days = Math.round(diff / MS_PER_DAY);
  if (Math.abs(days) >= 1) return format.format(days, 'day');

  const hours = Math.round(diff / MS_PER_HOUR);
  if (Math.abs(hours) >= 1) return format.format(hours, 'hour');

  return format.format(Math.round(diff / MS_PER_MINUTE), 'minute');
}

/** "1h 52min" — null quando o evento não tem fim definido ou é degenerado. */
export function durationLabel(startsAt: string, endsAt: string | null): string | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const hours = Math.floor(ms / MS_PER_HOUR);
  const minutes = Math.round((ms % MS_PER_HOUR) / MS_PER_MINUTE);
  return hours ? `${hours}h ${minutes.toString().padStart(2, '0')}min` : `${minutes}min`;
}

/**
 * Quanto falta e quanto já foi, para o card de "continuar assistindo".
 *
 * Devolve as PARTES, não a frase montada: a ordem e os conectivos mudam por
 * idioma, então quem junta é o ICU do i18n, não esta função.
 */
export function watchedSummary(
  positionSeconds: number,
  durationSeconds: number,
): { remaining: string; percent: number } | null {
  if (durationSeconds <= 0 || positionSeconds < 0) return null;

  const remainingSeconds = Math.max(0, durationSeconds - positionSeconds);
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.round((remainingSeconds % 3600) / 60);

  return {
    remaining: hours ? `${hours}h ${minutes.toString().padStart(2, '0')}min` : `${minutes}min`,
    // Arredonda para baixo: anunciar 100% assistido a quem ainda tem trecho
    // pela frente é pior do que anunciar 99%.
    percent: Math.min(100, Math.floor((positionSeconds / durationSeconds) * 100)),
  };
}
