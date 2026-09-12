import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';

describe('POST /api/auth/register', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the incoming Accept-Language header to the orchestrator', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ verificationRequired: true }), { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': 'es' },
      body: JSON.stringify({ email: 'a@b.com', password: 'x' }),
    });

    await POST(req);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get('Accept-Language')).toBe('es');
  });

  it('omits the header when the incoming request has none', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ verificationRequired: true }), { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'x' }),
    });

    await POST(req);

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get('Accept-Language')).toBeNull();
  });
});
