import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/http/client', () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

import { httpClient } from '@/lib/http/client';
import { organizationMembersService } from './organization-members.service';

const mocked = vi.mocked(httpClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('organizationMembersService invitations', () => {
  it('inviteMember posts to the invite route and returns the invitation', async () => {
    const invitation = { id: 'inv-1', email: 'friend@example.com', status: 'PENDING' };
    mocked.post.mockResolvedValueOnce({ data: invitation });

    const result = await organizationMembersService.inviteMember('org-1', {
      email: 'friend@example.com',
      role: 'OPERATOR',
    });

    expect(mocked.post).toHaveBeenCalledWith('/organizations/org-1/members/invite', {
      email: 'friend@example.com',
      role: 'OPERATOR',
    });
    expect(result).toBe(invitation);
  });

  it('listInvitations gets the invitations route', async () => {
    mocked.get.mockResolvedValueOnce({ data: [] });

    await organizationMembersService.listInvitations('org-1');

    expect(mocked.get).toHaveBeenCalledWith('/organizations/org-1/invitations');
  });

  it('revokeInvitation deletes the invitation', async () => {
    mocked.delete.mockResolvedValueOnce({ data: undefined });

    await organizationMembersService.revokeInvitation('org-1', 'inv-1');

    expect(mocked.delete).toHaveBeenCalledWith('/organizations/org-1/invitations/inv-1');
  });

  it('acceptInvitation posts the raw token with no body', async () => {
    mocked.post.mockResolvedValueOnce({ data: { invitation: {}, member: {} } });

    await organizationMembersService.acceptInvitation('raw-token');

    expect(mocked.post).toHaveBeenCalledWith('/organizations/invitations/raw-token/accept');
  });

  it('acceptInvitation url-encodes the token', async () => {
    mocked.post.mockResolvedValueOnce({ data: { invitation: {}, member: {} } });

    await organizationMembersService.acceptInvitation('a/b+c');

    expect(mocked.post).toHaveBeenCalledWith('/organizations/invitations/a%2Fb%2Bc/accept');
  });
});
