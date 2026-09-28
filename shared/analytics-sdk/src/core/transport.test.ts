import { describe, it, expect, vi } from 'vitest';
import { createFetchTransport } from './transport';

const res = (status: number) => Promise.resolve(new Response(null, { status }));
describe('fetch transport', () => {
  it.each([[202, 'ok'], [429, 'retry'], [503, 'retry'], [400, 'drop'], [401, 'drop']])('%i → %s', async (status, out) => {
    const t = createFetchTransport({ endpoint: 'https://api', fetchImpl: vi.fn(() => res(status)) as any });
    expect(await t.send({ writeKey: 'k', batch: [] }, { keepalive: false })).toBe(out);
  });
  it('network error → retry', async () => {
    const t = createFetchTransport({ endpoint: 'https://api', fetchImpl: vi.fn(() => Promise.reject(new TypeError('x'))) as any });
    expect(await t.send({ writeKey: 'k', batch: [] }, { keepalive: false })).toBe('retry');
  });
  it('sends bearer token and keepalive', async () => {
    const fetchImpl = vi.fn(() => res(202));
    const t = createFetchTransport({ endpoint: 'https://api', getAuthToken: () => 'jwt', fetchImpl: fetchImpl as any });
    await t.send({ writeKey: 'k', batch: [] }, { keepalive: true });
    const [url, init] = fetchImpl.mock.calls[0] as any;
    expect(url).toBe('https://api/v1/t/batch');
    expect(init.headers.Authorization).toBe('Bearer jwt');
    expect(init.keepalive).toBe(true);
  });
});
