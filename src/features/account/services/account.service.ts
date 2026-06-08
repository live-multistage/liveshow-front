import { httpClient } from '@/lib/http/client';
import type { RegisterRequest, LoginRequest, AuthResponse } from '../types/account.types';

export const accountService = {
  register: async (payload: RegisterRequest): Promise<AuthResponse> => {
    const { data } = await httpClient.post<AuthResponse>('/auth/register', payload);
    return data;
  },

  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const { data } = await httpClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },
};
