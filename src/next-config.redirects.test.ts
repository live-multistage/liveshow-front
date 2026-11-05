import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

// Old player URLs live on in e-mails, QR codes and notification links
// (`/live/:id?stream=…`). Next carries the query string across a config
// redirect, and these run before the middleware's login gate.
describe('legacy player redirects', () => {
  it('308s /live/:id and /replay/:id to /watch/:id', async () => {
    const redirects = await nextConfig.redirects!();
    expect(redirects).toEqual(
      expect.arrayContaining([
        { source: '/live/:id', destination: '/watch/:id', permanent: true },
        { source: '/replay/:id', destination: '/watch/:id', permanent: true },
      ]),
    );
  });
});
