// RRULE em canais é sempre uma recorrência semanal simples: o editor mostra
// checkboxes de dias da semana e nunca a regra crua. Duas funções puras dão
// conta do contrato aceito pelo backend.
export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

export type Weekday = (typeof WEEKDAYS)[number];

// Sete dias marcados viram FREQ=DAILY. Semanal SEMPRE carrega BYDAY — o backend
// recusa FREQ=WEEKLY sem ele, então lista vazia também cai em DAILY.
export function buildRRule(days: Weekday[]): string {
  const picked = WEEKDAYS.filter((day) => days.includes(day));
  if (picked.length === 0 || picked.length === WEEKDAYS.length) return 'FREQ=DAILY';
  return `FREQ=WEEKLY;BYDAY=${picked.join(',')}`;
}

export function parseRRule(rrule: string): Weekday[] {
  if (/FREQ=DAILY/i.test(rrule)) return [...WEEKDAYS];

  const byDay = /BYDAY=([A-Za-z,]+)/.exec(rrule);
  if (!byDay) return [];

  const picked = new Set(byDay[1].toUpperCase().split(','));
  return WEEKDAYS.filter((day) => picked.has(day));
}
