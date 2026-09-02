'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { slugify } from '@/features/events/utils/slug';
import type { AppError } from '@/lib/http/errors';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import {
  useCreateChannelMutation,
  useUpdateChannelMutation,
  useUploadChannelCoverMutation,
} from '../mutations/channel.mutations';
import {
  emptyPricingValue,
  isPricingValid,
  toCents,
  type PricingValue,
} from '../components/dashboard/ChannelPricingForm';
import { browserTimezone, supportedTimezones } from '../utils/timezone';

export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const SLUG_MIN = 3;
export const SLUG_MAX = 80;
export const DESCRIPTION_MAX = 500;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_MIME_TYPES = 'image/jpeg,image/png,image/webp';

// Mesmo formato que o backend valida no slug do canal.
export const SLUG_PATTERN = '[a-z0-9]+(-[a-z0-9]+)*';
const SLUG_REGEX = new RegExp(`^${SLUG_PATTERN}$`);

const isNameValid = (name: string) =>
  name.trim().length >= NAME_MIN && name.trim().length <= NAME_MAX;

const isSlugValid = (slug: string) =>
  slug.length >= SLUG_MIN && slug.length <= SLUG_MAX && SLUG_REGEX.test(slug);

export function useCreateChannelForm() {
  const t = useTranslations('channels.create');
  const router = useRouter();
  const { data: organizations = [] } = useMyOrganizationsQuery();
  const create = useCreateChannelMutation();
  const updateChannel = useUpdateChannelMutation();
  const uploadCover = useUploadChannelCoverMutation();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState(browserTimezone);
  const [pricing, setPricing] = useState<PricingValue>(emptyPricingValue);
  const [organizationId, setOrganizationId] = useState('');
  const [cover, setCover] = useState<File | null>(null);

  // Erros só aparecem depois que o campo perde o foco (ou o servidor recusa):
  // marcar "nome curto demais" enquanto a pessoa digita a primeira letra é ruído.
  const [nameError, setNameError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  // A primeira organização é o padrão implícito: quem só tem uma nunca precisa
  // tocar no seletor.
  const activeOrganizationId = organizationId || organizations[0]?.id || '';

  const timezones = useMemo(() => {
    const supported = supportedTimezones();
    return supported.includes(timezone) ? supported : [timezone, ...supported];
  }, [timezone]);

  // O slug acompanha o nome até alguém editá-lo à mão — depois disso ele é do usuário.
  const changeName = useCallback(
    (value: string) => {
      setName(value);
      setNameError(null);
      if (slugTouched) return;
      setSlug(slugify(value, SLUG_MAX));
      setSlugError(null);
    },
    [slugTouched],
  );

  const changeSlug = useCallback((value: string) => {
    setSlugTouched(true);
    setSlug(value);
    setSlugError(null);
  }, []);

  const changeCover = useCallback(
    (file: File | null) => {
      if (file && file.size > COVER_MAX_BYTES) {
        setCover(null);
        setCoverError(t('coverTooLarge'));
        return;
      }
      setCover(file);
      setCoverError(null);
    },
    [t],
  );

  const blurName = () => setNameError(isNameValid(name) ? null : t('nameError'));
  const blurSlug = () => setSlugError(isSlugValid(slug) ? null : t('slugError'));

  const canSubmit = Boolean(
    activeOrganizationId &&
      isNameValid(name) &&
      isSlugValid(slug) &&
      timezone.trim() &&
      isPricingValid(pricing) &&
      !create.isPending,
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    create.mutate(
      {
        organizationId: activeOrganizationId,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        timezone: timezone.trim(),
        accessMode: pricing.accessMode,
      },
      {
        onSuccess: (channel) => {
          // A capa é um segundo request porque POST /channels não aceita
          // multipart — o canal já existe quando ela sobe, e uma falha aqui
          // não desfaz a criação.
          if (cover) {
            uploadCover.mutate({
              id: channel.id,
              slug: channel.slug,
              organizationId: channel.organizationId,
              file: cover,
            });
          }
          // POST /channels não aceita preço (ver create-channel.dto.ts) — uma
          // assinatura paga é criada e depois precificada num segundo request.
          if (pricing.accessMode === 'SUBSCRIPTION') {
            updateChannel.mutate({
              id: channel.id,
              slug: channel.slug,
              organizationId: channel.organizationId,
              input: {
                accessMode: 'SUBSCRIPTION',
                currency: pricing.currency,
                monthlyPriceCents: toCents(pricing.monthlyPrice),
                yearlyPriceCents: toCents(pricing.yearlyPrice),
              },
            });
          }
          toast.success(t('successToast'));
          router.push(`/dashboard/channels/${channel.slug}`);
        },
        onError: (error: AppError) => {
          if (error.status === 409) setSlugError(t('slugTaken'));
        },
      },
    );
  };

  return {
    organizations,
    activeOrganizationId,
    setOrganizationId,
    name,
    changeName,
    blurName,
    nameError,
    slug,
    changeSlug,
    blurSlug,
    slugError,
    description,
    setDescription,
    timezone,
    setTimezone,
    timezones,
    pricing,
    setPricing,
    cover,
    changeCover,
    coverError,
    canSubmit,
    isPending: create.isPending,
    submit,
  };
}
