import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/http/client', () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import { httpClient } from '@/lib/http/client';
import { trackingAdminService } from './tracking-admin.service';

describe('trackingAdminService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getOverview() GETs the overview report', async () => {
    await trackingAdminService.getOverview();
    expect(httpClient.get).toHaveBeenCalledWith('/tracking/overview');
  });

  it('getSources() GETs the sources collection', async () => {
    await trackingAdminService.getSources();
    expect(httpClient.get).toHaveBeenCalledWith('/tracking/sources');
  });

  it('createSource() POSTs name/kind to the collection', async () => {
    await trackingAdminService.createSource({ name: 'Web', kind: 'web' });
    expect(httpClient.post).toHaveBeenCalledWith('/tracking/sources', { name: 'Web', kind: 'web' });
  });

  it('rotateSourceKey() POSTs to the rotate-key route', async () => {
    await trackingAdminService.rotateSourceKey('src-1');
    expect(httpClient.post).toHaveBeenCalledWith('/tracking/sources/src-1/rotate-key');
  });

  it('updateSource() PATCHes the source by id', async () => {
    await trackingAdminService.updateSource('src-1', { enabled: false });
    expect(httpClient.patch).toHaveBeenCalledWith('/tracking/sources/src-1', { enabled: false });
  });

  it('getPlan() GETs the plan', async () => {
    await trackingAdminService.getPlan();
    expect(httpClient.get).toHaveBeenCalledWith('/tracking/plan');
  });

  it('getUnplannedEvents() GETs the unplanned list', async () => {
    await trackingAdminService.getUnplannedEvents();
    expect(httpClient.get).toHaveBeenCalledWith('/tracking/plan/unplanned');
  });

  it('upsertPlanEvent() PUTs the event by name', async () => {
    const payload = { description: 'd', owner: null, properties: [], status: 'draft' as const };
    await trackingAdminService.upsertPlanEvent('checkout_started', payload);
    expect(httpClient.put).toHaveBeenCalledWith('/tracking/plan/checkout_started', payload);
  });

  it('deletePlanEvent() DELETEs the event by name', async () => {
    await trackingAdminService.deletePlanEvent('checkout_started');
    expect(httpClient.delete).toHaveBeenCalledWith('/tracking/plan/checkout_started');
  });

  it('getDestinations() GETs the destinations collection', async () => {
    await trackingAdminService.getDestinations();
    expect(httpClient.get).toHaveBeenCalledWith('/tracking/destinations');
  });

  it('createDestination() POSTs the payload to the collection', async () => {
    const payload = { name: 'Warehouse', url: 'https://example.com', eventFilter: [] };
    await trackingAdminService.createDestination(payload);
    expect(httpClient.post).toHaveBeenCalledWith('/tracking/destinations', payload);
  });

  it('updateDestination() PATCHes the destination by id', async () => {
    await trackingAdminService.updateDestination('dest-1', { enabled: false });
    expect(httpClient.patch).toHaveBeenCalledWith('/tracking/destinations/dest-1', { enabled: false });
  });

  it('deleteDestination() DELETEs the destination by id', async () => {
    await trackingAdminService.deleteDestination('dest-1');
    expect(httpClient.delete).toHaveBeenCalledWith('/tracking/destinations/dest-1');
  });

  it('getDestinationDeliveries() GETs deliveries with a default limit of 50', async () => {
    await trackingAdminService.getDestinationDeliveries('dest-1');
    expect(httpClient.get).toHaveBeenCalledWith('/tracking/destinations/dest-1/deliveries', {
      params: { limit: 50 },
    });
  });

  it('testDestination() POSTs to the test route', async () => {
    await trackingAdminService.testDestination('dest-1');
    expect(httpClient.post).toHaveBeenCalledWith('/tracking/destinations/dest-1/test');
  });

  it('exploreReport() POSTs the request body', async () => {
    const req = { from: 'a', to: 'b', event: 'checkout_started', interval: 'day' as const };
    await trackingAdminService.exploreReport(req);
    expect(httpClient.post).toHaveBeenCalledWith('/tracking/reports/explore', req);
  });

  it('funnelReport() POSTs the request body', async () => {
    const req = { from: 'a', to: 'b', steps: ['a', 'b'], windowMinutes: 30 };
    await trackingAdminService.funnelReport(req);
    expect(httpClient.post).toHaveBeenCalledWith('/tracking/reports/funnel', req);
  });

  it('retentionReport() POSTs the request body', async () => {
    const req = { from: 'a', to: 'b', startEvent: 'a', returnEvent: 'b', weeks: 4 };
    await trackingAdminService.retentionReport(req);
    expect(httpClient.post).toHaveBeenCalledWith('/tracking/reports/retention', req);
  });

  it('featuresReport() POSTs the request body', async () => {
    const req = { from: 'a', to: 'b' };
    await trackingAdminService.featuresReport(req);
    expect(httpClient.post).toHaveBeenCalledWith('/tracking/reports/features', req);
  });

  it('getUser() GETs the profile by id', async () => {
    await trackingAdminService.getUser('user-1');
    expect(httpClient.get).toHaveBeenCalledWith('/tracking/users/user-1');
  });

  it('getUserEvents() GETs the events page with cursor/limit', async () => {
    await trackingAdminService.getUserEvents('user-1', { cursor: 'c1', limit: 20 });
    expect(httpClient.get).toHaveBeenCalledWith('/tracking/users/user-1/events', {
      params: { cursor: 'c1', limit: 20 },
    });
  });

  it('getUserEvents() defaults limit to 50', async () => {
    await trackingAdminService.getUserEvents('user-1', {});
    expect(httpClient.get).toHaveBeenCalledWith('/tracking/users/user-1/events', {
      params: { cursor: undefined, limit: 50 },
    });
  });

  it('encodes an id/name with reserved characters in every interpolated path segment', async () => {
    const raw = 'a/b c';
    const encoded = encodeURIComponent(raw);

    await trackingAdminService.rotateSourceKey(raw);
    expect(httpClient.post).toHaveBeenCalledWith(`/tracking/sources/${encoded}/rotate-key`);

    await trackingAdminService.updateSource(raw, { enabled: true });
    expect(httpClient.patch).toHaveBeenCalledWith(`/tracking/sources/${encoded}`, { enabled: true });

    await trackingAdminService.upsertPlanEvent(raw, {
      description: 'd',
      owner: null,
      properties: [],
      status: 'draft',
    });
    expect(httpClient.put).toHaveBeenCalledWith(`/tracking/plan/${encoded}`, expect.anything());

    await trackingAdminService.deletePlanEvent(raw);
    expect(httpClient.delete).toHaveBeenCalledWith(`/tracking/plan/${encoded}`);

    await trackingAdminService.updateDestination(raw, { enabled: true });
    expect(httpClient.patch).toHaveBeenCalledWith(`/tracking/destinations/${encoded}`, { enabled: true });

    await trackingAdminService.deleteDestination(raw);
    expect(httpClient.delete).toHaveBeenCalledWith(`/tracking/destinations/${encoded}`);

    await trackingAdminService.getDestinationDeliveries(raw);
    expect(httpClient.get).toHaveBeenCalledWith(`/tracking/destinations/${encoded}/deliveries`, {
      params: { limit: 50 },
    });

    await trackingAdminService.testDestination(raw);
    expect(httpClient.post).toHaveBeenCalledWith(`/tracking/destinations/${encoded}/test`);

    await trackingAdminService.getUser(raw);
    expect(httpClient.get).toHaveBeenCalledWith(`/tracking/users/${encoded}`);

    await trackingAdminService.getUserEvents(raw, {});
    expect(httpClient.get).toHaveBeenCalledWith(`/tracking/users/${encoded}/events`, {
      params: { cursor: undefined, limit: 50 },
    });
  });
});
