import { describe, it, expect, vi, beforeEach } from 'vitest';

const redirect = vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); });
const notFound = vi.fn(() => { throw new Error('NOT_FOUND'); });

vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirect(url),
  notFound: () => notFound(),
}));
vi.mock('@/config', () => ({ config: { adsManagerUrl: 'https://ads.example.com' } }));

import Page from './page';

describe('/dashboard/advertisement/[id]', () => {
  beforeEach(() => {
    redirect.mockClear();
    notFound.mockClear();
  });

  it('forwards to the ad detail screen in the Ads Manager', async () => {
    const id = '1e9ec6a0-8ca3-4b3f-99af-120ea061eb75';
    await expect(Page({ params: Promise.resolve({ id }) })).rejects.toThrow('REDIRECT:');
    expect(redirect).toHaveBeenCalledWith(`https://ads.example.com/campaigns/${id}`);
  });

  it('404s instead of forwarding when the id is not an id', async () => {
    await expect(
      Page({ params: Promise.resolve({ id: '../../evil' }) }),
    ).rejects.toThrow('NOT_FOUND');
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('/dashboard/advertisement/billing', () => {
  it('forwards to the wallet in the Ads Manager', async () => {
    const BillingPage = (await import('../billing/page')).default;
    redirect.mockClear();
    expect(() => BillingPage()).toThrow('REDIRECT:');
    expect(redirect).toHaveBeenCalledWith('https://ads.example.com/billing');
  });
});
