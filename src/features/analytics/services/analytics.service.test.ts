import { describe, it, expect, afterEach } from 'vitest';
import type { AxiosAdapter, AxiosRequestConfig } from 'axios';
import { httpClient } from '@/lib/http/client';
import { analyticsService } from './analytics.service';

describe('analyticsService.getEventSales', () => {
  const originalAdapter = httpClient.defaults.adapter;
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
  });

  function capture() {
    const seen: AxiosRequestConfig[] = [];
    httpClient.defaults.adapter = (async (config) => {
      seen.push(config);
      return { data: { events: [] }, status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;
    return seen;
  }

  it('sends the granularity so the totals match the chart window', async () => {
    const seen = capture();

    await analyticsService.getEventSales('day');

    expect(seen[0].url).toBe('/sales/events');
    expect(seen[0].params).toEqual({ granularity: 'day' });
  });
});
