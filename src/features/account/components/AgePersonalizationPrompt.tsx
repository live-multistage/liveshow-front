'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMe } from '../queries/get-me';
import { useAuth } from '../hooks/use-auth';
import { useUpdateProfileMutation } from '../mutations/update-profile.mutation';
import { AgePersonalizationModal } from './AgePersonalizationModal';
import type { AgeBracket } from '../types/age-bracket.types';

const DISMISSED_KEY = 'agePrompt:dismissed';

// Mounted once at the app root (see src/providers/index.tsx) alongside the
// other authed-shell singletons (Toaster, ImpersonationBanner, ...). Gates
// on its own ['me'] fetch rather than AuthProvider's `user` — that value is
// only refreshed on login/profile-save, so it can go stale for an existing
// session and never reflect a freshly-set ageBracket without this.
export function AgePersonalizationPrompt() {
  const { isLoggedIn } = useAuth();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, staleTime: 60_000, enabled: isLoggedIn });
  const updateProfile = useUpdateProfileMutation();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
  }, []);

  const open = isLoggedIn && !!me && me.ageBracket == null && !dismissed;

  const handleSkip = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  const handleSave = (ageBracket: AgeBracket) => {
    updateProfile.mutate({ ageBracket });
  };

  return (
    <AgePersonalizationModal
      open={open}
      onSave={handleSave}
      onSkip={handleSkip}
      saving={updateProfile.isPending}
    />
  );
}
