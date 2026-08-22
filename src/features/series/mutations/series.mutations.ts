'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { seriesService } from '../services/series.service';
import { seriesKeys } from '../queries/series.queries';
import { normalizeError } from '@/lib/http/errors';
import type { CreateSeriesInput, UpdateSeriesInput, UpsertSeriesTicketProductInput } from '../types/series.types';

function useInvalidateSeries() {
  const qc = useQueryClient();
  return (organizationId: string, slug?: string) => {
    qc.invalidateQueries({ queryKey: seriesKeys.org(organizationId) });
    if (slug) qc.invalidateQueries({ queryKey: seriesKeys.detail(slug) });
  };
}

function useErrorToast() {
  const t = useTranslations('series');
  return () => toast.error(t('dashboard.errorToast'));
}

export function useCreateSeriesMutation() {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async (input: CreateSeriesInput) => {
      try {
        return await seriesService.create(input);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, input) => {
      qc.invalidateQueries({ queryKey: seriesKeys.list });
      qc.invalidateQueries({ queryKey: seriesKeys.org(input.organizationId) });
    },
  });
}

interface SeriesActionArgs {
  id: string;
  organizationId: string;
  slug: string;
}

export function useUpdateSeriesMutation() {
  const invalidate = useInvalidateSeries();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id, input }: SeriesActionArgs & { input: UpdateSeriesInput }) => {
      try {
        return await seriesService.update(id, input);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { organizationId, slug }) => invalidate(organizationId, slug),
  });
}

export function usePauseSeriesMutation() {
  const invalidate = useInvalidateSeries();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id }: SeriesActionArgs) => {
      try {
        return await seriesService.pause(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { organizationId, slug }) => invalidate(organizationId, slug),
  });
}

export function useResumeSeriesMutation() {
  const invalidate = useInvalidateSeries();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id }: SeriesActionArgs) => {
      try {
        return await seriesService.resume(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { organizationId, slug }) => invalidate(organizationId, slug),
  });
}

export function useEndSeriesMutation() {
  const invalidate = useInvalidateSeries();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id }: SeriesActionArgs) => {
      try {
        return await seriesService.end(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { organizationId, slug }) => invalidate(organizationId, slug),
  });
}

export function useMaterializeSeriesMutation() {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ id }: SeriesActionArgs) => {
      try {
        return await seriesService.materialize(id);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { id }) => qc.invalidateQueries({ queryKey: seriesKeys.episodes(id) }),
  });
}

interface ReattachEpisodeArgs {
  seriesId: string;
  eventId: string;
}

export function useReattachEpisodeMutation() {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ seriesId, eventId }: ReattachEpisodeArgs) => {
      try {
        return await seriesService.reattachEpisode(seriesId, eventId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { seriesId }) =>
      qc.invalidateQueries({ queryKey: seriesKeys.episodes(seriesId) }),
  });
}

interface CreateTicketProductArgs {
  seriesId: string;
  input: UpsertSeriesTicketProductInput;
}

export function useCreateSeriesTicketProductMutation() {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ seriesId, input }: CreateTicketProductArgs) => {
      try {
        return await seriesService.createTicketProduct(seriesId, input);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { seriesId }) =>
      qc.invalidateQueries({ queryKey: seriesKeys.ticketProducts(seriesId) }),
  });
}

interface UpdateTicketProductArgs {
  seriesId: string;
  productId: string;
  input: UpsertSeriesTicketProductInput;
}

export function useUpdateSeriesTicketProductMutation() {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ seriesId, productId, input }: UpdateTicketProductArgs) => {
      try {
        return await seriesService.updateTicketProduct(seriesId, productId, input);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { seriesId }) =>
      qc.invalidateQueries({ queryKey: seriesKeys.ticketProducts(seriesId) }),
  });
}

interface DeleteTicketProductArgs {
  seriesId: string;
  productId: string;
}

export function useDeleteSeriesTicketProductMutation() {
  const qc = useQueryClient();
  const toastError = useErrorToast();

  return useMutation({
    mutationFn: async ({ seriesId, productId }: DeleteTicketProductArgs) => {
      try {
        await seriesService.deleteTicketProduct(seriesId, productId);
      } catch (e) {
        throw normalizeError(e);
      }
    },
    onError: toastError,
    onSettled: (_data, _error, { seriesId }) =>
      qc.invalidateQueries({ queryKey: seriesKeys.ticketProducts(seriesId) }),
  });
}
