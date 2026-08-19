import type { UserRole } from '@/types';
import type { AgeBracket } from './age-bracket.types';

export interface RegisterRequest {
  email: string;
  displayName: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string | null;
  cpf?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  analyticsConsent?: boolean | null;
  ageBracket?: AgeBracket | null;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
