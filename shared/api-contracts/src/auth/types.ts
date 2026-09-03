import type { UserRole } from '../common/user-role';
import type { AgeBracket } from './age-bracket';

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

/** Social identity providers an account can be linked to. */
export type SocialProvider = 'GOOGLE' | 'APPLE';

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
  /** Linked social identities. Absent on responses that predate M5. */
  authProviders?: SocialProvider[];
  /** False for an account created through a social provider — hide "change password". */
  hasPassword?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/** `PATCH /auth/me`. Every field is optional — the API patches what it gets. */
export interface UpdateProfileRequest {
  displayName?: string;
  phone?: string;
  cpf?: string;
  bio?: string;
  ageBracket?: AgeBracket;
}

/** `POST /auth/change-password` → 204, or 400 WRONG_CURRENT_PASSWORD. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** One row of `GET /auth/sessions`. `current` marks the caller's own session. */
export interface SessionView {
  id: string;
  device: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

export interface SessionListPage {
  items: SessionView[];
  total: number;
  page: number;
  limit: number;
}

/** `POST /auth/me/avatar` (multipart, field `file`, ≤ 5 MB). */
export interface AvatarUploadResponse {
  avatarUrl: string;
}

/** `PATCH /privacy/consent`. */
export interface AnalyticsConsentResponse {
  analyticsConsent: boolean;
}

/**
 * `POST /auth/social` → `AuthResponse`. The native apps' sign-in: the provider
 * SDK returns an ID token, the server verifies it. `nonce` is the RAW nonce
 * the app generated — the token carries its sha256, which the server compares.
 * `fullName` and `authorizationCode` are Apple-only, and Apple sends the name
 * exactly once, on the first authorization.
 */
export interface SocialLoginRequest {
  provider: SocialProvider;
  idToken: string;
  nonce?: string;
  fullName?: string;
  authorizationCode?: string;
  rememberMe?: boolean;
}

/**
 * `code` values `POST /auth/social` can answer with. SOCIAL_CANCELLED never
 * comes from the server — the app raises it when the user dismisses the
 * provider sheet, so one mapper covers both sources.
 */
export type SocialLoginErrorCode =
  | 'SOCIAL_TOKEN_INVALID'
  | 'SOCIAL_EMAIL_REQUIRED'
  | 'SOCIAL_LOGIN_DISABLED'
  | 'SOCIAL_CANCELLED';
