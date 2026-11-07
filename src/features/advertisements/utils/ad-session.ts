const KEY = 'ads:sessionId';

let memoryFallback: string | null = null;

// Um id por sessão do navegador, estável entre remontagens do player. O
// backend só o grava no anúncio servido e no clique.
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
