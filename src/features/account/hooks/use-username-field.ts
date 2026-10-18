'use client';

import { useState } from 'react';
import { normalizeUsername } from '@live-show/api-contracts';
import type { AuthUser } from '../types/account.types';
import { useUsernameAvailability } from './use-username-availability';
import { useUpdateUsernameMutation } from '../mutations/update-username.mutation';
import { usernameFieldState } from '../utils/username-field-state';

// `me` may still be loading (SettingsPageContent calls hooks before its
// loading guard). `edited === null` means untouched, so the field shows the
// current handle without syncing state in an effect.
export function useUsernameField(me: AuthUser | undefined) {
  const current = me?.username ?? null;
  const [edited, setEdited] = useState<string | null>(null);
  const draft = edited ?? current ?? '';
  const availability = useUsernameAvailability(draft, current);
  const mutation = useUpdateUsernameMutation();

  const state = usernameFieldState({
    current,
    draft,
    changeAvailableAt: me?.usernameChangeAvailableAt ?? null,
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
    canSave: state.kind === 'available' && !mutation.isPending,
    saving: mutation.isPending,
    save: async () => {
      const updated = await mutation.mutateAsync({ username: normalizeUsername(draft) });
      setEdited(null);
      return updated;
    },
    reset: () => {
      mutation.reset();
      setEdited(null);
    },
  };
}
