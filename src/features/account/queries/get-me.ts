import { httpClient } from '@/lib/http/client';
import type { AuthUser } from '../types/account.types';

export async function getMe(): Promise<AuthUser> {
  const { data } = await httpClient.get<AuthUser>('/auth/me');
  return data;
}
