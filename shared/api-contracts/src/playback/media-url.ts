// Helpers de URL de mídia: puros, sem DOM e sem hls.js, porque os dois apps
// precisam da MESMA resposta para "qual token trocar" — o web reescreve a URL
// no xhrSetup, o mobile no player.replace().
const ABSOLUTE_URL_RE = /^https?:\/\//;

export function isAbsoluteMediaUrl(url: string): boolean {
  return ABSOLUTE_URL_RE.test(url);
}

// Um caminho de mídia ou é relativo à API, ou já vem absoluto no CDN.
export function resolveMediaUrl(apiUrl: string, path: string): string {
  return isAbsoluteMediaUrl(path) ? path : `${apiUrl}${path}`;
}

// A Bunny sempre carimba `token_path` junto do seu `token`/`expires`; é a
// presença dele que marca a URL como assinada pela borda. O esquema (`https://`)
// não serve de sinal: a própria apiUrl pode ser absoluta sem CDN nenhum.
export function hasCdnSignature(url: string): boolean {
  const q = url.indexOf('?');
  if (q === -1) return false;
  return new URLSearchParams(url.slice(q + 1)).has('token_path');
}

export function extractPt(url: string): string | null {
  const q = url.indexOf('?');
  if (q === -1) return null;
  const params = new URLSearchParams(url.slice(q + 1));
  const pt = params.get('pt');
  if (pt !== null) return pt;
  if (hasCdnSignature(url)) return null;
  return params.get('token');
}

export function stripPt(url: string): string {
  const q = url.indexOf('?');
  if (q === -1) return url;
  const params = new URLSearchParams(url.slice(q + 1));
  const legacyToken = !params.has('pt') && !hasCdnSignature(url);
  params.delete('pt');
  if (legacyToken) params.delete('token');
  const rest = params.toString();
  return rest ? `${url.slice(0, q)}?${rest}` : url.slice(0, q);
}

export function replacePtParam(url: string, token: string | null): string {
  if (!token) return url;
  const q = url.indexOf('?');
  if (q === -1) return url;
  const params = new URLSearchParams(url.slice(q + 1));
  if (params.has('pt')) {
    params.set('pt', token);
    return `${url.slice(0, q)}?${params.toString()}`;
  }
  if (!hasCdnSignature(url) && params.has('token')) {
    params.set('token', token);
    return `${url.slice(0, q)}?${params.toString()}`;
  }
  return url;
}
