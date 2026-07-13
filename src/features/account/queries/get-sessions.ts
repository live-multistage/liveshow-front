'use client';

import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { SessionView } from '../types/session.types';

export const sessionsKey = ['account', 'sessions'] as const;

async function getSessions(): Promise<SessionView[]> {
  const { data } = await httpClient.get<SessionView[]>('/auth/me/sessions');
  return data;
}

export function useSessionsQuery() {
  return useQuery({ queryKey: sessionsKey, queryFn: getSessions, staleTime: 30_000 });
}
