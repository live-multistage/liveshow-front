const KEY = 'ads:sessionId';

let memoryFallback: string | null = null;

// Um id por sessão do navegador: o backend usa para limitar frequência por
// espectador, então precisa sobreviver a remontagens do player.
export function getAdSessionId(): string {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored) return stored;
    const created = crypto.randomUUID();
    sessionStorage.setItem(KEY, created);
    return created;
  } catch {
    memoryFallback ??= crypto.randomUUID();
    return memoryFallback;
  }
}
