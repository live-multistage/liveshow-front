'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '@/features/account';
import { OrganizationHeader } from '../components/OrganizationHeader';
import { OrganizationForm } from '../components/OrganizationForm';
import { OrganizationLogoUploader } from '../components/OrganizationLogoUploader';
import { OrganizationBannerUploader } from '../components/OrganizationBannerUploader';
import { StripeConnectSection } from '../components/StripeConnectSection';
import { LedgerBalanceSection } from '../components/LedgerBalanceSection';
import { useOrganization } from '../hooks/use-organizations';
import { useOrganizationSettings } from '../hooks/use-organization-settings';
import { useUpdateOrganization } from '../hooks/use-update-organization';
import type { CreateOrganizationValues } from '../schemas/create-organization.schema';
import styles from './SettingsPage.module.scss';

interface Props {
  organizationId: string;
}

type StripeBannerState = 'complete' | 'refresh' | null;

export function SettingsPage({ organizationId }: Props) {
  const t = useTranslations('organizations');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const { data: org, isLoading: orgLoading, isError: orgError } = useOrganization(organizationId);
  const { data: settings } = useOrganizationSettings(organizationId);
  const updateMutation = useUpdateOrganization(organizationId);

  const [stripeBanner, setStripeBanner] = useState<StripeBannerState>(null);
  const bannerClearedRef = useRef(false);

  useEffect(() => {
    if (bannerClearedRef.current) return;
    const param = searchParams.get('stripe');
    if (param === 'complete' || param === 'refresh') {
      bannerClearedRef.current = true;
      setStripeBanner(param);
      const params = new URLSearchParams(searchParams.toString());
      params.delete('stripe');
      const newUrl = params.size > 0 ? `?${params}` : pathname;
      router.replace(newUrl);
    }
  }, [searchParams, router, pathname]);

  const handleGeneralSubmit = (values: CreateOrganizationValues) => {
    updateMutation.mutate(values);
  };

  if (orgLoading) return <p className={styles.state}>Carregando...</p>;
  if (orgError || !org) {
    return <p className={`${styles.state} ${styles.stateError}`}>{t('notFoundOrg')}</p>;
  }

  const isOwner = user?.id === org.ownerId;

  return (
    <div className={styles.page}>
      <OrganizationHeader organization={org} />

      <div className={styles.sections}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('sectionGeneral')}</h2>
          <div className={styles.sectionBody}>
            <OrganizationForm
              defaultValues={{
                name: org.name,
                slug: org.slug,
                description: org.description,
              }}
              onSubmit={handleGeneralSubmit}
              isPending={updateMutation.isPending}
              error={updateMutation.error?.message}
              submitLabel={t('saveChanges')}
              organizationId={organizationId}
              initialSlug={org.slug}
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('sectionVisual')}</h2>
          <div className={styles.sectionBody}>
            <div className={styles.brandingGrid}>
              <OrganizationLogoUploader
                currentUrl={settings?.logoUrl ?? org.logoUrl}
                onUpload={() => {}}
              />
              <OrganizationBannerUploader
                currentUrl={settings?.bannerUrl ?? org.bannerUrl}
                onUpload={() => {}}
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('sectionContact')}</h2>
          <div className={styles.sectionBody}>
            <ContactSettingsForm settings={settings} orgId={organizationId} />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('sectionIdentity')}</h2>
          <div className={styles.sectionBody}>
            <IdentitySettingsForm settings={settings} orgId={organizationId} />
          </div>
        </section>

        {isOwner && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('sectionPayouts')}</h2>
            {stripeBanner && (
              <div
                className={styles.banner}
                data-variant={stripeBanner === 'complete' ? 'success' : 'warning'}
              >
                <span>
                  {stripeBanner === 'complete'
                    ? t('stripeConnected')
                    : t('stripeLinkExpired')}
                </span>
                <button
                  className={styles.bannerClose}
                  onClick={() => setStripeBanner(null)}
                  aria-label={t('close')}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className={styles.sectionBody}>
              <StripeConnectSection orgId={organizationId} />
              <LedgerBalanceSection orgId={organizationId} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ContactSettingsForm({
  settings,
}: {
  settings?: ReturnType<typeof useOrganizationSettings>['data'];
  orgId: string;
}) {
  const t = useTranslations('organizations');
  return (
    <div className={styles.fieldGrid}>
      <Field label={t('fieldEmail')} name="email" defaultValue={settings?.email} />
      <Field label={t('fieldSupportEmail')} name="supportEmail" defaultValue={settings?.supportEmail} />
      <Field label={t('fieldPhone')} name="phone" defaultValue={settings?.phone} />
    </div>
  );
}

function IdentitySettingsForm({
  settings,
}: {
  settings?: ReturnType<typeof useOrganizationSettings>['data'];
  orgId: string;
}) {
  const t = useTranslations('organizations');
  return (
    <div className={styles.fieldGrid}>
      <Field label={t('fieldLegalName')} name="legalName" defaultValue={settings?.legalName} />
      <Field label={t('fieldDocument')} name="documentNumber" defaultValue={settings?.documentNumber} />
      <Field label={t('fieldCountry')} name="country" defaultValue={settings?.country} />
      <Field label={t('fieldState')} name="state" defaultValue={settings?.state} />
      <Field label={t('fieldCity')} name="city" defaultValue={settings?.city} />
      <Field label={t('fieldTimezone')} name="timezone" defaultValue={settings?.timezone} />
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      <input
        className={styles.fieldInput}
        name={name}
        defaultValue={defaultValue ?? ''}
        placeholder={label}
      />
    </div>
  );
}
