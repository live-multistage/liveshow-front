'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@live-show/design-system';
import {
  useUpdateChannelMutation,
  useUploadChannelCoverMutation,
} from '../../mutations/channel.mutations';
import type { Channel } from '../../types/channel.types';
import { supportedTimezones } from '../../utils/timezone';
import styles from './ChannelForm.module.scss';

interface Props {
  initial: Channel;
  onDone?: () => void;
}

const COVER_MIME_TYPES = 'image/jpeg,image/png,image/webp';

/**
 * Edição da identidade de um canal existente (nome, descrição, timezone,
 * capa). Acesso/preço vive em `ChannelPricingForm` — o card de acesso do
 * dashboard abre esse formulário à parte. A criação vive em
 * `CreateChannelForm` — ela tem layout, validação e copy próprios, e nada
 * além do modelo de dados em comum.
 */
export function ChannelForm({ initial, onDone }: Props) {
  const t = useTranslations('channels');

  const update = useUpdateChannelMutation();
  const uploadCover = useUploadChannelCoverMutation();

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? '');
  const [timezone, setTimezone] = useState(initial.timezone);

  const timezones = useMemo(supportedTimezones, []);

  const canSubmit = Boolean(name.trim() && timezone.trim());

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadCover.mutate({
      id: initial.id,
      slug: initial.slug,
      organizationId: initial.organizationId,
      file,
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || update.isPending) return;

    update.mutate(
      {
        id: initial.id,
        slug: initial.slug,
        organizationId: initial.organizationId,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
          timezone: timezone.trim(),
        },
      },
      { onSuccess: () => onDone?.() },
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-name">
          {t('dashboard.name')}
        </label>
        <Input id="channel-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-slug">
          {t('dashboard.slug')}
        </label>
        {/* O backend não renomeia slug — ele fica visível só como referência. */}
        <Input id="channel-slug" value={initial.slug} readOnly />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-description">
          {t('dashboard.description')}
        </label>
        <Input
          id="channel-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-timezone">
          {t('dashboard.timezone')}
        </label>
        <Input
          id="channel-timezone"
          list="channel-timezone-options"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
        />
        <datalist id="channel-timezone-options">
          {timezones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-cover">
          {t('dashboard.cover')}
        </label>
        <input
          id="channel-cover"
          type="file"
          accept={COVER_MIME_TYPES}
          className={styles.file}
          onChange={handleCoverChange}
        />
        <span className={styles.hint}>{t('dashboard.coverHint')}</span>
      </div>

      <Button type="submit" disabled={update.isPending}>
        {t('dashboard.save')}
      </Button>
    </form>
  );
}
