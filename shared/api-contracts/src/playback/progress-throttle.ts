/**
 * Cadência de gravação da posição de reprodução.
 *
 * O player emite atualização várias vezes por segundo; mandar cada uma seria um
 * DDoS do próprio player. Dez segundos é o pior caso de perda quando o app morre
 * sem aviso — a saída limpa é coberta pelo flush de unmount/background.
 */
export const REPORT_INTERVAL_MS = 10_000;

/** Abaixo disto não vale gravar: ninguém quer retomar 3s dentro do vídeo. */
export const MIN_REPORTABLE_SECONDS = 5;

export function shouldReportProgress(input: {
  lastReportedAt: number;
  now: number;
  positionSeconds: number;
}): boolean {
  if (input.positionSeconds < MIN_REPORTABLE_SECONDS) return false;
  return input.now - input.lastReportedAt >= REPORT_INTERVAL_MS;
}
