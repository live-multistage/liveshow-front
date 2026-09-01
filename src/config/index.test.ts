import { describe, it, expect } from 'vitest';
import { shouldProxyApi, mediaUrl, config } from './index';

describe('mediaUrl', () => {
  it('returns an absolute CDN URL untouched (no double /api prefix)', () => {
    const abs = 'https://liveshow-dev.local:3000/api/packages/x/live/master.m3u8?token=a';
    expect(mediaUrl(abs)).toBe(abs);
  });

  it('prefixes a relative path with apiUrl', () => {
    expect(mediaUrl('/packages/x/live/master.m3u8')).toBe(
      `${config.apiUrl}/packages/x/live/master.m3u8`,
    );
  });
});

const at = (apiUrl: string, page: string) => {
  const url = new URL(page);
  return shouldProxyApi({ apiUrl, pageProtocol: url.protocol, pageHostname: url.hostname });
};

describe('shouldProxyApi', () => {
  it('leaves desktop on localhost talking straight to the API', () => {
    expect(at('http://localhost:8080/api', 'http://localhost:3000')).toBe(false);
  });

  /** "localhost" no celular seria o próprio celular. */
  it('proxies when a remote browser was handed a loopback API', () => {
    expect(at('http://localhost:8080/api', 'http://192.168.18.20:3000')).toBe(true);
  });

  /**
   * O caso que estava quebrado: página em HTTPS e API em HTTP noutra máquina.
   * A regra antiga só olhava para loopback, então isto passava direto e o
   * navegador bloqueava os segmentos.
   */
  it('proxies an https page pointed at an http API on another host', () => {
    expect(at('http://192.168.18.155:8080/api', 'https://liveshow-dev.local:3000')).toBe(true);
  });

  it('leaves an https page talking to an https API alone', () => {
    expect(at('https://api.liveshow.com/api', 'https://liveshow-dev.local:3000')).toBe(false);
  });

  /** Página em HTTP não sofre mixed content: nada a contornar. */
  it('does not proxy an http page reaching an http API on another host', () => {
    expect(at('http://192.168.18.155:8080/api', 'http://192.168.18.155:3000')).toBe(false);
  });
});
