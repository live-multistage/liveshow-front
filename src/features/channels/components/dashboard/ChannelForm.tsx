'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Input } from '@live-show/design-system';
import { useMyOrganizationsQuery } from '@/features/organizations/queries/get-my-organizations';
import { useCreateChannelMutation } from '../../mutations/channel.mutations';
import styles from './ChannelForm.module.scss';

// Fuso do navegador como padrão: quem cria o canal quase sempre está no fuso
// em que ele vai ao ar, e digitar "America/Sao_Paulo" à mão é um convite a erro.
const browserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  } catch {
    return 'America/Sao_Paulo';
  }
};

export function ChannelForm() {
  const t = useTranslations('channels');
  const tDashboard = useTranslations('dashboard');
  const router = useRouter();
  const { data: organizations = [] } = useMyOrganizationsQuery();
  const mutation = useCreateChannelMutation();

  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [timezone, setTimezone] = useState(browserTimezone);

  // A primeira organização é o padrão implícito: quem só tem uma nunca precisa
  // tocar no seletor.
  const activeOrganizationId = organizationId || organizations[0]?.id || '';
  const canSubmit = Boolean(activeOrganizationId && name.trim() && slug.trim() && timezone.trim());

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || mutation.isPending) return;

    mutation.mutate(
      {
        organizationId: activeOrganizationId,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        timezone: timezone.trim(),
      },
      { onSuccess: (channel) => router.push(`/dashboard/channels/${channel.slug}`) },
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1 className={styles.heading}>{t('dashboard.new')}</h1>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="channel-organization">
          {tDashboard('nav.organizations')}
        </label>
        <select
          id="channel-organization"
          className={styles.select}
          value={activeOrganizationId}
          onChange={(event) => setOrganizationId(event.target.value)}
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </div>

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
        <Input id="channel-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
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
        <Input id="channel-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        {t('dashboard.save')}
      </Button>
    </form>
  );
}
