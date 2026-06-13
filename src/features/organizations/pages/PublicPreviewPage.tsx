'use client';

import { Building2, Calendar } from 'lucide-react';
import { OrganizationHeader } from '../components/OrganizationHeader';
import { useOrganization } from '../hooks/use-organizations';
import { useOrganizationSettings } from '../hooks/use-organization-settings';
import styles from './PublicPreviewPage.module.scss';

interface Props {
  organizationId: string;
}

export function PublicPreviewPage({ organizationId }: Props) {
  const { data: org, isLoading, isError } = useOrganization(organizationId);
  const { data: settings } = useOrganizationSettings(organizationId);

  if (isLoading) return <p className={styles.state}>Carregando...</p>;
  if (isError || !org) {
    return <p className={`${styles.state} ${styles.stateError}`}>Organização não encontrada.</p>;
  }

  const bannerUrl = settings?.bannerUrl ?? org.bannerUrl;
  const logoUrl = settings?.logoUrl ?? org.logoUrl;

  return (
    <div className={styles.page}>
      <OrganizationHeader organization={org} />

      <div className={styles.preview}>
        <p className={styles.previewLabel}>Pré-visualização pública</p>

        <div className={styles.publicCard}>
          <div className={styles.banner}>
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner" className={styles.bannerImg} />
            ) : (
              <div className={styles.bannerPlaceholder} />
            )}
          </div>

          <div className={styles.profileSection}>
            <div className={styles.logoWrapper}>
              {logoUrl ? (
                <img src={logoUrl} alt={org.name} className={styles.logoImg} />
              ) : (
                <div className={styles.logoPlaceholder}>
                  <Building2 size={28} />
                </div>
              )}
            </div>
            <div className={styles.profileInfo}>
              <h2 className={styles.orgName}>{org.name}</h2>
              <p className={styles.orgSlug}>@{org.slug}</p>
              {org.description && <p className={styles.orgDesc}>{org.description}</p>}
            </div>
          </div>

          <div className={styles.eventsSection}>
            <h3 className={styles.eventsTitle}>
              <Calendar size={14} />
              Próximos Eventos
            </h3>
            <p className={styles.eventsEmpty}>Nenhum evento programado.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
