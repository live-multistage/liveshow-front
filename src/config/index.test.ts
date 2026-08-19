import { describe, it, expect } from 'vitest';
import { shouldProxyApi } from './index';

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
