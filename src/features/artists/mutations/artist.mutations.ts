'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { normalizeError } from '@/lib/http/errors';
import {
  artistService,
  type CreateArtistRequest,
  type UpdateArtistRequest,
} from '../services/artist.service';
import {
  ARTISTS_LIST_KEY,
  myArtistsKey,
  artistKey,
  artistInvitationsKey,
  eventLineupKey,
} from '../hooks/use-artists';

export function useCreateArtistMutation() {
  const qc = useQueryClient();
  const t = useTranslations('artists.dashboard.toasts');

  return useMutation({
    mutationFn: async (payload: CreateArtistRequest) => {
      try {
        return await artistService.create(payload);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: () => {
      toast.success(t('created'));
    },
    onError: () => {
      toast.error(t('error'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: myArtistsKey });
      qc.invalidateQueries({ queryKey: ARTISTS_LIST_KEY });
    },
  });
}

export function useUpdateArtistMutation(id: string) {
  const qc = useQueryClient();
  const t = useTranslations('artists.dashboard.toasts');

  return useMutation({
    mutationFn: async (payload: UpdateArtistRequest) => {
      try {
        return await artistService.update(id, payload);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: () => {
      toast.success(t('updated'));
    },
    onError: () => {
      toast.error(t('error'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: myArtistsKey });
      qc.invalidateQueries({ queryKey: artistKey(id) });
      qc.invalidateQueries({ queryKey: ARTISTS_LIST_KEY });
    },
  });
}

export function useDeleteArtistMutation() {
  const qc = useQueryClient();
  const t = useTranslations('artists.dashboard.toasts');

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        return await artistService.remove(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: () => {
      toast.success(t('deleted'));
    },
    onError: () => {
      toast.error(t('error'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: myArtistsKey });
      qc.invalidateQueries({ queryKey: ARTISTS_LIST_KEY });
    },
  });
}

/** Event-org admin invites an artist to an event's lineup. */
export function useInviteArtistMutation(eventId: string) {
  const qc = useQueryClient();
  const t = useTranslations('artists.dashboard.toasts');

  return useMutation({
    mutationFn: async (artistId: string) => {
      try {
        return await artistService.invite(artistId, eventId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: () => {
      toast.success(t('invited'));
    },
    onError: () => {
      toast.error(t('error'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: eventLineupKey(eventId) });
    },
  });
}

/** Artist owner accepts/declines an invitation. */
export function useRespondArtistInviteMutation(artistId: string) {
  const qc = useQueryClient();
  const t = useTranslations('artists.dashboard.toasts');

  return useMutation({
    mutationFn: async ({ eventId, action }: { eventId: string; action: 'accept' | 'decline' }) => {
      try {
        return await artistService.respondInvite(artistId, eventId, action);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.action === 'accept' ? t('accepted') : t('declined'));
    },
    onError: () => {
      toast.error(t('error'));
    },
    onSettled: (_data, _err, variables) => {
      qc.invalidateQueries({ queryKey: artistInvitationsKey(artistId) });
      qc.invalidateQueries({ queryKey: eventLineupKey(variables.eventId) });
    },
  });
}

/** Org withdraws an invite, or the artist leaves the lineup — same endpoint. */
export function useRemoveArtistFromEventMutation(eventId: string) {
  const qc = useQueryClient();
  const t = useTranslations('artists.dashboard.toasts');

  return useMutation({
    mutationFn: async (artistId: string) => {
      try {
        return await artistService.removeFromEvent(artistId, eventId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: () => {
      toast.success(t('removed'));
    },
    onError: () => {
      toast.error(t('error'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: eventLineupKey(eventId) });
    },
  });
}

export function useUploadArtistAvatarMutation(artistId: string) {
  const qc = useQueryClient();
  const t = useTranslations('artists.dashboard.toasts');

  return useMutation({
    mutationFn: async (file: File) => {
      try {
        return await artistService.uploadAvatar(artistId, file);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: () => {
      toast.success(t('updated'));
    },
    onError: () => {
      toast.error(t('error'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: myArtistsKey });
      qc.invalidateQueries({ queryKey: artistKey(artistId) });
    },
  });
}

export function useUploadArtistBannerMutation(artistId: string) {
  const qc = useQueryClient();
  const t = useTranslations('artists.dashboard.toasts');

  return useMutation({
    mutationFn: async (file: File) => {
      try {
        return await artistService.uploadBanner(artistId, file);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onSuccess: () => {
      toast.success(t('updated'));
    },
    onError: () => {
      toast.error(t('error'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: myArtistsKey });
      qc.invalidateQueries({ queryKey: artistKey(artistId) });
    },
  });
}
