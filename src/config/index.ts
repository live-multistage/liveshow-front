const rawApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');

/**
 * O navegador consegue falar DIRETO com a API, ou as chamadas precisam passar
 * pelo proxy same-origin `/api` (rewrites do next.config)?
 *
 * Duas situações distintas, e tratar só a primeira era o furo que deixava o
 * player sem segmentos:
 *
 *  1. API em localhost + navegador remoto (celular em https://192.168.x.x:3000):
 *     "localhost" ali seria o próprio celular.
 *
 *  2. Página em HTTPS + API em HTTP, ainda que em outra máquina. O navegador
 *     BLOQUEIA — não é aviso: XHR e EventSource não saem, e os segmentos do
 *     player nunca chegam. Só localhost é isento da regra de mixed content.
 */
export function shouldProxyApi(opts: {
  apiUrl: string;
  pageProtocol: string;
  pageHostname: string;
}): boolean {
  const apiPointsAtLoopback = /\/\/(localhost|127\.0\.0\.1)/.test(opts.apiUrl);
  const browserIsRemote = !['localhost', '127.0.0.1'].includes(opts.pageHostname);
  const pageIsSecure = opts.pageProtocol === 'https:';
  const apiIsInsecure = opts.apiUrl.startsWith('http://');

  return (browserIsRemote && apiPointsAtLoopback) || (pageIsSecure && apiIsInsecure);
}

const mustProxy =
  typeof window !== 'undefined' &&
  shouldProxyApi({
    apiUrl: rawApiUrl,
    pageProtocol: window.location.protocol,
    pageHostname: window.location.hostname,
  });

export const config = {
  apiUrl: mustProxy ? '/api' : rawApiUrl,
  appName: 'Liveshow',
  adsManagerUrl: process.env.NEXT_PUBLIC_ADS_MANAGER_URL ?? 'http://localhost:3002',
} as const;
