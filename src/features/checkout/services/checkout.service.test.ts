import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { httpClient } from '@/lib/http/client';
import { checkoutService } from './checkout.service';

// Attribution is not a call argument — it rides every request as x-attribution-*
// headers set by the shared interceptor. This guards the free-ticket claim
// specifically: dropping it would silently erase free-event conversions from
// ad reporting, with no error anywhere.
describe('checkoutService.claimFreeTicket', () => {
  const originalAdapter = httpClient.defaults.adapter;

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
  });

  it('posts the ticket product id with the captured attribution headers', async () => {
    sessionStorage.setItem(
      'ls_attribution',
      JSON.stringify({
        channel: 'OTHER',
        utmSource: 'meta',
        utmMedium: 'paid',
        utmCampaign: 'summer',
        referrerHost: 'facebook.com',
      }),
    );

    let sent: Parameters<AxiosAdapter>[0] | undefined;
    const order = { id: 'order-1', code: '#LS-000001' };
    httpClient.defaults.adapter = (async (config) => {
      sent = config;
      return { data: { order, granted: true }, status: 201, statusText: 'Created', headers: {}, config };
    }) as AxiosAdapter;

    await expect(checkoutService.claimFreeTicket('tp-free')).resolves.toEqual({ order, granted: true });

    expect(sent?.url).toBe('/orders/free-ticket');
    expect(JSON.parse(sent?.data as string)).toEqual({ ticketProductId: 'tp-free' });
    expect(sent?.headers.get('x-attribution-channel')).toBe('OTHER');
    expect(sent?.headers.get('x-attribution-source')).toBe('meta');
    expect(sent?.headers.get('x-attribution-medium')).toBe('paid');
    expect(sent?.headers.get('x-attribution-campaign')).toBe('summer');
    expect(sent?.headers.get('x-attribution-referrer')).toBe('facebook.com');
  });
});

describe('checkoutService.placeOrder', () => {
  const originalAdapter = httpClient.defaults.adapter;

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
  });

  it('posts to /orders with the payload and the captured attribution headers', async () => {
    sessionStorage.setItem(
      'ls_attribution',
      JSON.stringify({
        channel: 'OTHER',
        utmSource: 'meta',
        utmMedium: 'paid',
        utmCampaign: 'summer',
        referrerHost: 'facebook.com',
      }),
    );

    let sent: Parameters<AxiosAdapter>[0] | undefined;
    const response = {
      order: { id: 'order-1', code: '#LS-000001' },
      payment: { id: 'pay-1', action: { type: 'REDIRECT', url: 'https://stripe.test/session' } },
    };
    httpClient.defaults.adapter = (async (config) => {
      sent = config;
      return { data: response, status: 201, statusText: 'Created', headers: {}, config };
    }) as AxiosAdapter;

    await expect(
      checkoutService.placeOrder({ provider: 'STRIPE', couponCode: 'SUMMER10' }),
    ).resolves.toEqual(response);

    expect(sent?.url).toBe('/orders');
    expect(JSON.parse(sent?.data as string)).toEqual({ provider: 'STRIPE', couponCode: 'SUMMER10' });
    expect(sent?.headers.get('x-attribution-channel')).toBe('OTHER');
    expect(sent?.headers.get('x-attribution-source')).toBe('meta');
    expect(sent?.headers.get('x-attribution-medium')).toBe('paid');
    expect(sent?.headers.get('x-attribution-campaign')).toBe('summer');
    expect(sent?.headers.get('x-attribution-referrer')).toBe('facebook.com');
  });
});
