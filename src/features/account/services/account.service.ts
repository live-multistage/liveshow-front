import { httpClient } from '@/lib/http/client';
import type { RegisterRequest, LoginRequest, AuthResponse } from '../types/account.types';
import type {
  RegisterResponse,
  VerifyEmailRequest,
  EmailOnlyRequest,
  ResetPasswordRequest,
  MailingUnsubscribeResponse,
} from '@live-show/api-contracts';

export const accountService = {
  register: async (payload: RegisterRequest): Promise<RegisterResponse> => {
    const { data } = await httpClient.post<RegisterResponse>('/auth/register', payload);
    return data;
  },

  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const { data } = await httpClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  verifyEmail: async (payload: VerifyEmailRequest): Promise<void> => {
    await httpClient.post('/auth/verify-email', payload);
  },

  resendVerification: async (payload: EmailOnlyRequest): Promise<void> => {
    await httpClient.post('/auth/resend-verification', payload);
  },

  forgotPassword: async (payload: EmailOnlyRequest): Promise<void> => {
    await httpClient.post('/auth/forgot-password', payload);
  },

  resetPassword: async (payload: ResetPasswordRequest): Promise<void> => {
    await httpClient.post('/auth/reset-password', payload);
  },

  unsubscribe: async (token: string): Promise<void> => {
    // Token in the query string: it is also the RFC 8058 one-click URL shape.
    await httpClient.post<MailingUnsubscribeResponse>('/mailing/unsubscribe', null, { params: { token } });
  },
};
