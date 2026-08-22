'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { channelService } from '../services/channel.service';
import { channelKeys } from '../queries/channel.queries';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type {
  CreateChannelInput,
  SubscriptionInterval,
  UpdateChannelInput,
  UpsertProgramInput,
} from '../types/channel.types';

function useInvalidateChannel() {
  const qc = useQueryClient();
  return (id: string, slug: string, organizationId: string) => {
    qc.invalidateQueries({ queryKey: channelKeys.org(organizationId) });
    qc.invalidateQueries({ queryKey: channelKeys.orgDetail(id) });
    qc.invalidateQueries({ queryKey: channelKeys.detail(slug) });
    qc.invalidateQueries({ queryKey: channelKeys.playback(slug) });
  };
}

function useErrorToast() {
  const t = useTranslations('channels');
  return () => toast.error(t('errorToast'));
}

export function useCreateChannelMutation() {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async (input: CreateChannelInput) => {
      try {
        return await channelService.create(input);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, input) => {
      qc.invalidateQueries({ queryKey: channelKeys.list });
      qc.invalidateQueries({ queryKey: channelKeys.org(input.organizationId) });
    },
  });
}

interface UpdateChannelArgs {
  id: string;
  slug: string;
  organizationId: string;
  input: UpdateChannelInput;
}

export function useUpdateChannelMutation() {
  const invalidate = useInvalidateChannel();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id, input }: UpdateChannelArgs) => {
      try {
        return await channelService.update(id, input);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { id, slug, organizationId }) => invalidate(id, slug, organizationId),
  });
}

interface ChannelActionArgs {
  id: string;
  slug: string;
  organizationId: string;
}

export function usePublishChannelMutation() {
  const invalidate = useInvalidateChannel();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id }: ChannelActionArgs) => {
      try {
        return await channelService.publish(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { id, slug, organizationId }) => invalidate(id, slug, organizationId),
  });
}

export function useArchiveChannelMutation() {
  const invalidate = useInvalidateChannel();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id }: ChannelActionArgs) => {
      try {
        return await channelService.archive(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { id, slug, organizationId }) => invalidate(id, slug, organizationId),
  });
}

export function useSyncChannelPricingMutation() {
  const invalidate = useInvalidateChannel();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id }: ChannelActionArgs) => {
      try {
        return await channelService.syncPricing(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { id, slug, organizationId }) => invalidate(id, slug, organizationId),
  });
}

interface UploadCoverArgs {
  id: string;
  slug: string;
  organizationId: string;
  file: File;
}

export function useUploadChannelCoverMutation() {
  const invalidate = useInvalidateChannel();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id, file }: UploadCoverArgs) => {
      try {
        return await channelService.uploadCover(id, file);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { id, slug, organizationId }) => invalidate(id, slug, organizationId),
  });
}

interface UpsertProgramArgs {
  input: UpsertProgramInput;
  programId?: string;
  slug: string;
}

export function useUpsertProgramMutation(channelId: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ input, programId }: UpsertProgramArgs) => {
      try {
        return await channelService.upsertProgram(channelId, input, programId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { slug }) => {
      qc.invalidateQueries({ queryKey: channelKeys.detail(slug) });
      qc.invalidateQueries({ queryKey: channelKeys.programs(channelId) });
      qc.invalidateQueries({ queryKey: ['channels', 'schedule', slug] });
    },
  });
}

interface DeleteProgramArgs {
  programId: string;
  slug: string;
}

export function useDeleteProgramMutation(channelId: string) {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ programId }: DeleteProgramArgs) => {
      try {
        await channelService.deleteProgram(channelId, programId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { slug }) => {
      qc.invalidateQueries({ queryKey: channelKeys.detail(slug) });
      qc.invalidateQueries({ queryKey: channelKeys.programs(channelId) });
      qc.invalidateQueries({ queryKey: ['channels', 'schedule', slug] });
    },
  });
}

interface SetSourceOverrideArgs {
  id: string;
  slug: string;
  organizationId: string;
  eventId: string;
}

export function useSetChannelSourceOverrideMutation() {
  const invalidate = useInvalidateChannel();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id, eventId }: SetSourceOverrideArgs) => {
      try {
        return await channelService.setSourceOverride(id, eventId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { id, slug, organizationId }) => invalidate(id, slug, organizationId),
  });
}

export function useClearChannelSourceOverrideMutation() {
  const invalidate = useInvalidateChannel();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id }: ChannelActionArgs) => {
      try {
        return await channelService.clearSourceOverride(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { id, slug, organizationId }) => invalidate(id, slug, organizationId),
  });
}

interface SubscribeChannelArgs {
  channelId: string;
  interval: SubscriptionInterval;
}

export function useSubscribeChannelMutation() {
  const t = useTranslations('channels.subscription');

  return useMutation({
    mutationFn: async ({ channelId, interval }: SubscribeChannelArgs) => {
      try {
        return await channelService.subscribe(channelId, interval);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    // O checkout do Stripe é hospedado — a navegação sai do app, não há
    // estado local para atualizar antes disso.
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    onError: (err: AppError) => {
      toast.error(err.status === 409 ? t('alreadySubscribed') : t('error'));
    },
  });
}
