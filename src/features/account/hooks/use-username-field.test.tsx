import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/account.service', () => ({
  accountService: { usernameAvailability: vi.fn(), updateUsername: vi.fn() },
}));
const login = vi.fn();
vi.mock('../context/AuthProvider', () => ({ useAuthContextValue: () => ({ login }) }));

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { accountService } from '../services/account.service';
import { useUsernameField } from './use-username-field';
import type { AuthUser } from '../types/account.types';

const me = { id: 'u1', email: 'a@x.com', displayName: 'Joana', role: 'USER', username: 'joana.m', usernameChangeAvailableAt: null } as AuthUser;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

beforeEach(() => vi.clearAllMocks());

describe('useUsernameField', () => {
  it('starts on the current handle and does not call the API', () => {
    const { result } = renderHook(() => useUsernameField(me), { wrapper });
    expect(result.current.state).toEqual({ kind: 'current' });
    expect(result.current.dirty).toBe(false);
    expect(accountService.usernameAvailability).not.toHaveBeenCalled();
  });

  it('checks a valid new handle (debounced) and allows saving when available', async () => {
    vi.mocked(accountService.usernameAvailability).mockResolvedValue({ available: true });
    const { result } = renderHook(() => useUsernameField(me), { wrapper });
    act(() => result.current.setDraft('joana.martins'));
    expect(result.current.state).toEqual({ kind: 'checking' });
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'available' }));
    expect(accountService.usernameAvailability).toHaveBeenCalledWith('joana.martins');
    expect(result.current.canSave).toBe(true);
  });

  it('never asks the API about a locally invalid handle', async () => {
    const { result } = renderHook(() => useUsernameField(me), { wrapper });
    act(() => result.current.setDraft('Joana Martins!'));
    await new Promise((r) => setTimeout(r, 400));
    expect(result.current.state).toEqual({ kind: 'invalid' });
    expect(accountService.usernameAvailability).not.toHaveBeenCalled();
  });

  it('save sends the normalized handle and syncs the session user', async () => {
    vi.mocked(accountService.usernameAvailability).mockResolvedValue({ available: true });
    vi.mocked(accountService.updateUsername).mockResolvedValue({ ...me, username: 'joana.martins' });
    const { result } = renderHook(() => useUsernameField(me), { wrapper });
    act(() => result.current.setDraft('Joana.Martins'));
    await waitFor(() => expect(result.current.canSave).toBe(true));
    await act(() => result.current.save());
    expect(accountService.updateUsername).toHaveBeenCalledWith('joana.martins');
    expect(login).toHaveBeenCalledWith(expect.objectContaining({ username: 'joana.martins' }));
  });

  it('an availability error is not "checking" and still allows saving (the PATCH decides)', async () => {
    vi.mocked(accountService.usernameAvailability).mockRejectedValue({ status: 429 });
    const { result } = renderHook(() => useUsernameField(me), { wrapper });
    act(() => result.current.setDraft('joana.martins'));
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'unverified' }));
    expect(result.current.canSave).toBe(true);
  });

  it('a 429 on save goes straight to cooldown and keeps Save disabled', async () => {
    vi.mocked(accountService.usernameAvailability).mockResolvedValue({ available: true });
    vi.mocked(accountService.updateUsername).mockRejectedValue({ status: 429, message: 'too soon' });
    const { result } = renderHook(() => useUsernameField(me), { wrapper });
    act(() => result.current.setDraft('joana.martins'));
    await waitFor(() => expect(result.current.canSave).toBe(true));
    await act(async () => {
      await result.current.save().catch(() => undefined);
    });
    expect(result.current.state.kind).toBe('cooldown');
    expect(result.current.canSave).toBe(false);
    act(() => result.current.setDraft('joana.outra'));
    expect(result.current.state.kind).toBe('cooldown');
    expect(result.current.canSave).toBe(false);
  });
});
