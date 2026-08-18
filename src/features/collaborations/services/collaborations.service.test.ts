import { describe, it, expect, afterEach } from 'vitest';
import type { AxiosAdapter, AxiosRequestConfig } from 'axios';
import { httpClient } from '@/lib/http/client';
import { collaborationsService } from './collaborations.service';
import type { EventCollaborator, CollaborationInvite, OrganizationSearchResult } from '../types/collaboration.types';

const COLLABORATOR: EventCollaborator = {
  id: 'collab-1',
  organization: {
    id: 'org-1',
    name: 'Org Name',
    slug: 'org-slug',
    logoUrl: null,
  },
  status: 'ACCEPTED',
  createdAt: '2026-01-01T10:00:00.000Z',
};

const INVITE: CollaborationInvite = {
  id: 'invite-1',
  event: {
    id: 'ev-1',
    title: 'Event Title',
  },
  ownerOrganization: {
    id: 'org-1',
    name: 'Org Name',
    logoUrl: null,
  },
  createdAt: '2026-01-01T10:00:00.000Z',
};

const SEARCH_RESULT: OrganizationSearchResult = {
  id: 'org-1',
  name: 'Org Name',
  logoUrl: null,
};

describe('collaborationsService', () => {
  const originalAdapter = httpClient.defaults.adapter;
  afterEach(() => {
    httpClient.defaults.adapter = originalAdapter;
  });

  function capture(payload: unknown = []) {
    const seen: AxiosRequestConfig[] = [];
    httpClient.defaults.adapter = (async (config) => {
      seen.push(config);
      return { data: payload, status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;
    return seen;
  }

  describe('listEventCollaborators', () => {
    it('reads from /events/:eventId/collaborators', async () => {
      const seen = capture([COLLABORATOR]);

      await collaborationsService.listEventCollaborators('ev-1');

      expect(seen[0].url).toBe('/events/ev-1/collaborators');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('returns the collaborators as given', async () => {
      capture([COLLABORATOR]);

      await expect(collaborationsService.listEventCollaborators('ev-1')).resolves.toEqual([COLLABORATOR]);
    });
  });

  describe('invite', () => {
    it('posts to /events/:eventId/collaborators with organizationId', async () => {
      const seen = capture(COLLABORATOR);

      await collaborationsService.invite('ev-1', 'org-1');

      expect(seen[0].url).toBe('/events/ev-1/collaborators');
      expect(seen[0].method?.toLowerCase()).toBe('post');
      expect(JSON.parse(seen[0].data as string)).toEqual({ organizationId: 'org-1' });
    });

    it('returns the created collaborator', async () => {
      capture(COLLABORATOR);

      await expect(collaborationsService.invite('ev-1', 'org-1')).resolves.toEqual(COLLABORATOR);
    });
  });

  describe('cancelInvite', () => {
    it('deletes /events/:eventId/collaborators/:collaborationId', async () => {
      const seen = capture(undefined);

      await collaborationsService.cancelInvite('ev-1', 'collab-1');

      expect(seen[0].url).toBe('/events/ev-1/collaborators/collab-1');
      expect(seen[0].method?.toLowerCase()).toBe('delete');
    });
  });

  describe('listOrgInvites', () => {
    it('reads from /organizations/:orgId/collaboration-invites', async () => {
      const seen = capture([INVITE]);

      await collaborationsService.listOrgInvites('org-1');

      expect(seen[0].url).toBe('/organizations/org-1/collaboration-invites');
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('returns the invites as given', async () => {
      capture([INVITE]);

      await expect(collaborationsService.listOrgInvites('org-1')).resolves.toEqual([INVITE]);
    });
  });

  describe('accept', () => {
    it('posts to /collaboration-invites/:id/accept', async () => {
      const seen = capture(INVITE);

      await collaborationsService.accept('invite-1');

      expect(seen[0].url).toBe('/collaboration-invites/invite-1/accept');
      expect(seen[0].method?.toLowerCase()).toBe('post');
    });

    it('returns the invite', async () => {
      capture(INVITE);

      await expect(collaborationsService.accept('invite-1')).resolves.toEqual(INVITE);
    });
  });

  describe('decline', () => {
    it('posts to /collaboration-invites/:id/decline', async () => {
      const seen = capture(undefined);

      await collaborationsService.decline('invite-1');

      expect(seen[0].url).toBe('/collaboration-invites/invite-1/decline');
      expect(seen[0].method?.toLowerCase()).toBe('post');
    });
  });

  describe('searchOrganizations', () => {
    it('reads from /organizations/search with query param', async () => {
      const seen = capture([SEARCH_RESULT]);

      await collaborationsService.searchOrganizations('query');

      expect(seen[0].url).toBe('/organizations/search');
      expect(seen[0].params).toEqual({ q: 'query' });
      expect(seen[0].method?.toLowerCase()).toBe('get');
    });

    it('returns the results as given', async () => {
      capture([SEARCH_RESULT]);

      await expect(collaborationsService.searchOrganizations('query')).resolves.toEqual([SEARCH_RESULT]);
    });
  });
});
