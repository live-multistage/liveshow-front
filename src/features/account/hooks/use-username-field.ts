'use client';

import { useState } from 'react';
import { normalizeUsername } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';
import type { AuthUser } from '../types/account.types';
import { useUsernameAvailability } from './use-username-availability';
import { useUpdateUsernameMutation } from '../mutations/update-username.mutation';
import { USERNAME_COOLDOWN_CODE, usernameFieldState } from '../utils/username-field-state';

const ISO_DATE = /\d{4}-\d{2}-\d{2}T[\d:.]+Z/;

// `me` may still be loading (SettingsPageContent calls hooks before its
// loading guard). `edited === null` means untouched, so the field shows the
// current handle without syncing state in an effect.
export function useUsernameField(me: AuthUser | undefined) {
  const current = me?.username ?? null;
  const [edited, setEdited] = useState<string | null>(null);
  const draft = edited ?? current ?? '';
  const availability = useUsernameAvailability(draft, current);
  // Set on the cooldown error so Save stays locked until /auth/me brings the real date.
  const [tooSoon, setTooSoon] = useState<{ until: string | null } | null>(null);
  const mutation = useUpdateUsernameMutation();

  const state = usernameFieldState({
    current,
    draft,
    changeAvailableAt: me?.usernameChangeAvailableAt ?? tooSoon?.until ?? null,
    rateLimited: tooSoon !== null,
    availabilityFailed: availability.isError,
    now: new Date(),
    availability: availability.data,
    checking: availability.isChecking,
    serverError: mutation.error?.code,
  });

  const setDraft = (value: string) => {
    mutation.reset();
    setEdited(value);
  };

  return {
    draft,
    setDraft,
    state,
    dirty: state.kind !== 'current' && state.kind !== 'cooldown',
    canSave: (state.kind === 'available' || state.kind === 'unverified') && !mutation.isPending,
    saving: mutation.isPending,
    save: async () => {
      try {
        const updated = await mutation.mutateAsync({ username: normalizeUsername(draft) });
        setEdited(null);
        return updated;
      } catch (error) {
        const e = error as AppError;
        if (e.code === USERNAME_COOLDOWN_CODE) setTooSoon({ until: e.message?.match(ISO_DATE)?.[0] ?? null });
        throw error;
      }
    },
    reset: () => {
      setTooSoon(null);
      mutation.reset();
      setEdited(null);
    },
  };
}
