'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http/client';
import type { AppError } from '@/lib/http/errors';

// Multipart upload of the profile photo. Server stores it, sets the user's
// avatarUrl and returns it. Invalidates the cached "me" so the new photo shows.
export function useUploadAvatarMutation() {
  const qc = useQueryClient();
  return useMutation<{ avatarUrl: string }, AppError, File>({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await httpClient.post<{ avatarUrl: string }>('/auth/me/avatar', form);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
