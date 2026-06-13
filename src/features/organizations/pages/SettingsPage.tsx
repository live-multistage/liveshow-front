'use client';

import { OrganizationHeader } from '../components/OrganizationHeader';
import { OrganizationForm } from '../components/OrganizationForm';
import { OrganizationLogoUploader } from '../components/OrganizationLogoUploader';
import { OrganizationBannerUploader } from '../components/OrganizationBannerUploader';
import { useOrganization } from '../hooks/use-organizations';
import { useOrganizationSettings } from '../hooks/use-organization-settings';
import { useUpdateOrganization } from '../hooks/use-update-organization';
import type { CreateOrganizationValues } from '../schemas/create-organization.schema';
import styles from './SettingsPage.module.scss';

interface Props {
  organizationId: string;
}

export function SettingsPage({ organizationId }: Props) {
  const { data: org, isLoading: orgLoading, isError: orgError } = useOrganization(organizationId);
  const { data: settings } = useOrganizationSettings(organizationId);
  const updateMutation = useUpdateOrganization(organizationId);

  const handleGeneralSubmit = (values: CreateOrganizationValues) => {
    updateMutation.mutate(values);
  };

  if (orgLoading) return <p className={styles.state}>Carregando...</p>;
  if (orgError || !org) {
    return <p className={`${styles.state} ${styles.stateError}`}>Organização não encontrada.</p>;
  }

  return (
    <div className={styles.page}>
      <OrganizationHeader organization={org} />

      <div className={styles.sections}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Geral</h2>
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
              submitLabel="Salvar Alterações"
              organizationId={organizationId}
              initialSlug={org.slug}
            />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Identidade Visual</h2>
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
          <h2 className={styles.sectionTitle}>Informações de Contato</h2>
          <div className={styles.sectionBody}>
            <ContactSettingsForm settings={settings} orgId={organizationId} />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Informações de Identidade</h2>
          <div className={styles.sectionBody}>
            <IdentitySettingsForm settings={settings} orgId={organizationId} />
          </div>
        </section>
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
  return (
    <div className={styles.fieldGrid}>
      <Field label="E-mail" name="email" defaultValue={settings?.email} />
      <Field label="E-mail de Suporte" name="supportEmail" defaultValue={settings?.supportEmail} />
      <Field label="Telefone" name="phone" defaultValue={settings?.phone} />
    </div>
  );
}

function IdentitySettingsForm({
  settings,
}: {
  settings?: ReturnType<typeof useOrganizationSettings>['data'];
  orgId: string;
}) {
  return (
    <div className={styles.fieldGrid}>
      <Field label="Razão Social" name="legalName" defaultValue={settings?.legalName} />
      <Field label="CNPJ / Documento" name="documentNumber" defaultValue={settings?.documentNumber} />
      <Field label="País" name="country" defaultValue={settings?.country} />
      <Field label="Estado" name="state" defaultValue={settings?.state} />
      <Field label="Cidade" name="city" defaultValue={settings?.city} />
      <Field label="Fuso Horário" name="timezone" defaultValue={settings?.timezone} />
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
