'use client';

import { useRef, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { Upload, X, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@live-show/design-system';
import type { ArtistResponse, ArtistStatus } from '@live-show/api-contracts';
import {
  useCreateArtistMutation,
  useUpdateArtistMutation,
  useUploadArtistAvatarMutation,
  useUploadArtistBannerMutation,
} from '../mutations/artist.mutations';
import type { CreateArtistRequest } from '../services/artist.service';
import { ArtistSlugField } from './ArtistSlugField';
import styles from './ArtistProfileForm.module.scss';

const SOCIAL_PLATFORMS = ['instagram', 'youtube', 'x', 'tiktok', 'site'] as const;
const MAX_GENRES = 12;

export interface ArtistFormValues {
  name: string;
  slug: string;
  description: string;
  genres: string[];
  status: ArtistStatus;
  socialLinks: { platform: string; url: string }[];
}

interface Props {
  artist?: ArtistResponse;
  onSaved?: () => void;
}

function toFormValues(artist?: ArtistResponse): ArtistFormValues {
  return {
    name: artist?.name ?? '',
    slug: artist?.slug ?? '',
    description: artist?.description ?? '',
    genres: artist?.genres ?? [],
    status: artist?.status ?? 'ACTIVE',
    socialLinks: artist?.socialLinks ?? [],
  };
}

function GenresField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function commit() {
    const genre = draft.trim();
    setDraft('');
    if (!genre || value.length >= MAX_GENRES || value.includes(genre)) return;
    onChange([...value, genre]);
  }

  return (
    <div className={styles.tagsField}>
      {value.map((genre) => (
        <span key={genre} className={styles.tagChip}>
          {genre}
          <button
            type="button"
            onClick={() => onChange(value.filter((g) => g !== genre))}
            className={styles.tagRemove}
            aria-label={`Remover ${genre}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        maxLength={40}
        placeholder={value.length === 0 ? 'Ex: pop, indie, sertanejo...' : ''}
        className={styles.tagsInput}
        disabled={value.length >= MAX_GENRES}
      />
    </div>
  );
}

function ImageDropzone({
  label,
  currentUrl,
  onUpload,
  isPending,
  shape,
}: {
  label: string;
  currentUrl?: string;
  onUpload: (file: File) => void;
  isPending?: boolean;
  shape: 'avatar' | 'banner';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setPreview(URL.createObjectURL(file));
    onUpload(file);
  };

  const src = preview ?? currentUrl;

  return (
    <div className={styles.uploader}>
      <p className={styles.label}>{label}</p>
      <div
        className={`${styles.dropzone} ${shape === 'banner' ? styles.dropzoneBanner : styles.dropzoneAvatar}`}
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- object/blob URLs, next/image can't optimize these
          <img src={src} alt={label} className={styles.preview} />
        ) : (
          <div className={styles.placeholder}>
            <Upload size={18} />
            <span>Clique ou arraste para enviar</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.hidden}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        disabled={isPending}
      />
    </div>
  );
}

export function ArtistProfileForm({ artist, onSaved }: Props) {
  const t = useTranslations('artists');
  const isEditing = !!artist;

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ArtistFormValues>({
    defaultValues: toFormValues(artist),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'socialLinks' });

  const createMutation = useCreateArtistMutation();
  const updateMutation = useUpdateArtistMutation(artist?.id ?? '');
  const uploadAvatarMutation = useUploadArtistAvatarMutation(artist?.id ?? '');
  const uploadBannerMutation = useUploadArtistBannerMutation(artist?.id ?? '');

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: ArtistFormValues) => {
    const payload: CreateArtistRequest = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      genres: values.genres,
      socialLinks: values.socialLinks.filter((link) => link.url.trim()),
      status: values.status,
    };

    if (isEditing) {
      // NOTE: CreateArtistRequest/UpdateArtistRequest don't carry `slug` yet —
      // the backend derives it from `name` (same as events). The slug field
      // above is availability-preview UX only until the contract exposes it.
      updateMutation.mutate(payload, { onSuccess: () => onSaved?.() });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onSaved?.() });
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <div className={styles.grid2}>
        <div className={styles.field}>
          <Label className={styles.label}>{t('dashboard.profile.name')}</Label>
          <Input
            {...register('name', { required: 'Obrigatório', minLength: { value: 2, message: 'Mínimo 2 caracteres' } })}
            placeholder="Nome artístico"
          />
          {errors.name && <p className={styles.error}>{errors.name.message}</p>}
        </div>

        <ArtistSlugField control={control} excludeId={artist?.id} initialSlug={artist?.slug} />
      </div>

      <div className={styles.field}>
        <Label className={styles.label}>{t('dashboard.profile.bio')}</Label>
        <textarea
          {...register('description', { maxLength: { value: 2000, message: 'Máximo 2000 caracteres' } })}
          className={styles.textarea}
          rows={4}
          placeholder="Conte um pouco sobre o artista..."
        />
        {errors.description && <p className={styles.error}>{errors.description.message}</p>}
      </div>

      <div className={styles.field}>
        <Label className={styles.label}>{t('dashboard.profile.genres')}</Label>
        <Controller
          control={control}
          name="genres"
          render={({ field }) => <GenresField value={field.value} onChange={field.onChange} />}
        />
      </div>

      <div className={styles.switchRow}>
        <div>
          <Label className={styles.label}>{t('dashboard.profile.status')}</Label>
          <p className={styles.hint}>Perfis ocultos não aparecem no catálogo público.</p>
        </div>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Switch
              checked={field.value === 'ACTIVE'}
              onCheckedChange={(checked) => field.onChange(checked ? 'ACTIVE' : 'HIDDEN')}
            />
          )}
        />
      </div>

      {isEditing && artist && (
        <div className={styles.grid2}>
          <ImageDropzone
            label={t('dashboard.profile.avatar')}
            currentUrl={artist.imageUrl}
            onUpload={(file) => uploadAvatarMutation.mutate(file)}
            isPending={uploadAvatarMutation.isPending}
            shape="avatar"
          />
          <ImageDropzone
            label={t('dashboard.profile.banner')}
            currentUrl={artist.bannerUrl}
            onUpload={(file) => uploadBannerMutation.mutate(file)}
            isPending={uploadBannerMutation.isPending}
            shape="banner"
          />
        </div>
      )}

      <div className={styles.field}>
        <Label className={styles.label}>{t('dashboard.profile.socialLinks')}</Label>
        <div className={styles.socialLinks}>
          {fields.map((item, index) => (
            <div key={item.id} className={styles.socialRow}>
              <Controller
                control={control}
                name={`socialLinks.${index}.platform`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={styles.platformTrigger}>
                      <SelectValue placeholder="Rede" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOCIAL_PLATFORMS.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          {t(`socials.${platform}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Input
                {...register(`socialLinks.${index}.url` as const)}
                placeholder="https://..."
                className={styles.socialUrl}
              />
              <button
                type="button"
                className={styles.removeSocial}
                onClick={() => remove(index)}
                aria-label="Remover rede social"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={styles.addSocial}
          onClick={() => append({ platform: SOCIAL_PLATFORMS[0], url: '' })}
        >
          <Plus size={14} />
          Adicionar rede social
        </Button>
      </div>

      <div className={styles.footer}>
        <Button type="submit" disabled={isPending || isSubmitting}>
          {isEditing ? t('dashboard.profile.save') : t('dashboard.profile.create')}
        </Button>
      </div>
    </form>
  );
}
