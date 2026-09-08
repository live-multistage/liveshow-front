import type { AppError } from '@/lib/http/errors';

/**
 * The API answers invite/revoke/accept with bare HTTP codes and an internal
 * message; both the members screen and the accept page need the same
 * human copy, so the mapping lives here once. Returns a key under the
 * `organizations` i18n namespace.
 */
export function inviteErrorKey(error: Pick<AppError, 'status'>): string {
  switch (error.status) {
    case 400:
      return 'inviteErrorInvalidEmail';
    case 403:
      return 'inviteErrorForbidden';
    case 404:
      return 'inviteErrorOrgNotFound';
    case 409:
      return 'inviteErrorAlreadyMember';
    default:
      return 'inviteErrorGeneric';
  }
}

export function revokeErrorKey(error: Pick<AppError, 'status'>): string {
  switch (error.status) {
    case 400:
      return 'revokeErrorNotPending';
    case 403:
      return 'inviteErrorForbidden';
    case 404:
      return 'revokeErrorNotFound';
    default:
      return 'inviteErrorGeneric';
  }
}

export function acceptErrorKey(error: Pick<AppError, 'status'>): string {
  switch (error.status) {
    case 400:
      return 'acceptErrorNotPending';
    case 403:
      return 'acceptErrorWrongAccount';
    case 404:
      return 'acceptErrorInvalidToken';
    case 409:
      return 'acceptErrorAlreadyMember';
    case 410:
      return 'acceptErrorExpired';
    default:
      return 'acceptErrorGeneric';
  }
}
