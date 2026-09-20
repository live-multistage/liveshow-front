'use client';

import { useState, cloneElement, isValidElement, type ReactNode, type ReactElement } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { LayoutGrid, Plus, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button, Label, Skeleton } from '@live-show/design-system';
import { useAsaasSubaccount } from '../hooks/use-asaas-subaccount';
import { useCreateAsaasSubaccount } from '../hooks/use-create-asaas-subaccount';
import { asaasSubaccountSchema, type AsaasSubaccountForm } from '../schemas/asaas-subaccount.schema';
import {
  digitsOnly,
  formatCpfCnpj,
  formatPhone,
  formatPostalCode,
  digitsToCents,
  formatBRLFromCents,
} from '../utils/asaas-input-masks';
import type { CreateAsaasSubaccountRequest } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';
import styles from './AsaasAccountSection.module.scss';

interface Props {
  orgId: string;
}

type Status = 'none' | 'pending' | 'active' | 'rejected';

const BADGE_KEYS: Record<Status, string> = {
  none: 'asaas.badgeNotConnected',
  pending: 'asaas.badgePending',
  active: 'asaas.badgeActive',
  rejected: 'asaas.badgeRejected',
};

const BADGE_ICONS: Record<Status, ReactNode> = {
  none: null,
  pending: <Clock size={11} />,
  active: <CheckCircle2 size={11} />,
  rejected: <XCircle size={11} />,
};

// The Asaas company-type field maps a Brazilian legal structure to the
// enum Asaas' KYC API expects.
const COMPANY_TYPE_KEYS: Record<string, string> = {
  MEI: 'asaas.companyTypeMei',
  LIMITED: 'asaas.companyTypeLimited',
  INDIVIDUAL: 'asaas.companyTypeIndividual',
  ASSOCIATION: 'asaas.companyTypeAssociation',
};

function digitsOf(value: string | undefined) {
  return (value ?? '').replace(/\D/g, '');
}

// Extracts an HTTP status from either a raw AxiosError (what the read query
// throws, since organizationService.getAsaasSubaccount only normalizes 404)
// or an already-normalized AppError (what the create mutation throws).
function statusOf(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) return error.response?.status;
  return (error as AppError | null)?.status;
}

type Translate = ReturnType<typeof useTranslations>;

export function AsaasAccountSection({ orgId }: Props) {
  const t = useTranslations('organizations');
  const locale = useLocale();
  const { data: account, isLoading, isError, error } = useAsaasSubaccount(orgId);
  const createMutation = useCreateAsaasSubaccount(orgId);
  const [showForm, setShowForm] = useState(false);

  if (isLoading) {
    return (
      <div className={styles.card} data-testid="asaas-loading">
        <div className={styles.loading}>
          <div className={styles.headerLeft}>
            <span className={styles.icon}>
              <LayoutGrid size={18} />
            </span>
            <span className={styles.title}>{t('asaas.title')}</span>
          </div>
          <Skeleton className={styles.skeletonPill} />
        </div>
        <Skeleton className={styles.skeletonBar} />
        <Skeleton className={styles.skeletonBar} data-short="true" />
      </div>
    );
  }

  if (isError) {
    if (statusOf(error) === 503) {
      return (
        <div className={styles.card}>
          <div className={styles.headerLeft} style={{ marginBottom: '0.875rem' }}>
            <span className={styles.icon} data-muted="true">
              <LayoutGrid size={18} />
            </span>
            <span className={styles.title} data-muted="true">
              {t('asaas.title')}
            </span>
          </div>
          <p className={styles.unavailableDescription}>{t('asaas.unavailableDescription')}</p>
        </div>
      );
    }
    return <p className={styles.error}>{t('asaas.loadError')}</p>;
  }

  if (showForm) {
    return (
      <AsaasForm
        t={t}
        mutation={createMutation}
        onCancel={() => setShowForm(false)}
        onSuccess={() => setShowForm(false)}
      />
    );
  }

  if (!account) {
    return (
      <div className={styles.card}>
        <Header t={t} status="none" />
        <p className={styles.description}>{t('asaas.emptyDescription')}</p>
        <Button className={styles.cta} onClick={() => setShowForm(true)}>
          <Plus size={16} />
          {t('asaas.ctaConnect')}
        </Button>
      </div>
    );
  }

  if (account.status === 'PENDING_APPROVAL') {
    return (
      <div className={styles.card}>
        <Header t={t} status="pending" />
        <p className={styles.description}>{t('asaas.pendingDescription')}</p>
        <div className={styles.footer}>
          <span>{t('asaas.walletLabel')}</span> <span>{account.walletIdMasked}</span>
        </div>
      </div>
    );
  }

  if (account.status === 'ACTIVE') {
    return (
      <div className={styles.card}>
        <Header t={t} status="active" />
        <p className={styles.description}>{t('asaas.activeDescription')}</p>
        <div className={styles.footer}>
          <span>{t('asaas.walletLabel')}</span> <span>{account.walletIdMasked}</span>
          <span className={styles.footerDot}>·</span>
          <span>{t('asaas.createdAtLabel')}</span>{' '}
          <span>{new Date(account.createdAt).toLocaleDateString(locale)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <Header t={t} status="rejected" />
      <p className={styles.description}>{t('asaas.rejectedDescription')}</p>
    </div>
  );
}

function Header({ t, status }: { t: Translate; status: Status }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <span className={styles.icon}>
          <LayoutGrid size={18} />
        </span>
        <span className={styles.title}>{t('asaas.title')}</span>
      </div>
      <span className={styles.badge} data-status={status}>
        {BADGE_ICONS[status]}
        {t(BADGE_KEYS[status])}
      </span>
    </div>
  );
}

function AsaasForm({
  t,
  mutation,
  onCancel,
  onSuccess,
}: {
  t: Translate;
  mutation: ReturnType<typeof useCreateAsaasSubaccount>;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitted },
  } = useForm<AsaasSubaccountForm>({
    resolver: zodResolver(asaasSubaccountSchema),
    // companyType/birthDate mount and unmount as the user types through the
    // CPF/CNPJ digit count; without this, RHF leaves a stale '' behind for
    // whichever field last unmounted, and the schema's `.optional()` (which
    // only tolerates `undefined`, not '') rejects it.
    shouldUnregister: true,
  });

  const cpfCnpjDigits = digitsOf(watch('cpfCnpj'));
  const isCnpj = cpfCnpjDigits.length === 14;
  const isCpf = cpfCnpjDigits.length === 11;
  const hasFieldErrors = Object.keys(errors).length > 0;

  // The schema's cpfCnpj field chains two refinements (right length, then a
  // valid checksum) behind one path, so we can't tell from `errors.cpfCnpj`
  // alone which one failed. The digit count already tells us: anything other
  // than 11/14 digits is a length problem, otherwise it's a bad checksum.
  const cpfCnpjError = errors.cpfCnpj
    ? cpfCnpjDigits.length === 11 || cpfCnpjDigits.length === 14
      ? t('asaas.fieldCpfCnpjInvalid')
      : t('asaas.fieldCpfCnpjLength')
    : undefined;

  const onSubmit = (values: AsaasSubaccountForm) => {
    // The zod resolver already ran .transform() (digits-only cpfCnpj/phone/
    // postalCode), so `values` here is the wire shape even though its static
    // type is still the pre-transform input.
    mutation.mutate(values as unknown as CreateAsaasSubaccountRequest, { onSuccess });
  };

  const serverErrorKey =
    mutation.error?.status === 409
      ? 'asaas.serverErrorConflict'
      : mutation.error?.status === 503
        ? 'asaas.serverErrorUnavailable'
        : mutation.error
          ? 'asaas.serverErrorGeneric'
          : null;

  return (
    <div className={styles.card}>
      <div className={styles.header} style={{ marginBottom: '1.25rem' }}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>
            <LayoutGrid size={18} />
          </span>
          <div className={styles.titleGroup}>
            <span className={styles.title}>{t('asaas.title')}</span>
            <span className={styles.subtitle}>{t('asaas.formSubtitle')}</span>
          </div>
        </div>
      </div>

      {(serverErrorKey || (isSubmitted && hasFieldErrors)) && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          {t(serverErrorKey ?? 'asaas.formErrorBanner')}
        </div>
      )}

      {/* noValidate: the native type="email" constraint check otherwise
          blocks the submit event before RHF/zod ever run, so an invalid
          email never reaches our own error UI. */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={styles.sectionLabel}>{t('asaas.sectionHolder')}</div>
        <div className={styles.grid}>
          <Field t={t} label="asaas.fieldName" id="asaas-name" full>
            <input className={styles.input} id="asaas-name" {...register('name')} />
          </Field>
          <Field
            t={t}
            label="asaas.fieldEmail"
            id="asaas-email"
            error={errors.email ? t('asaas.fieldEmailError') : undefined}
          >
            <input className={styles.input} id="asaas-email" type="email" {...register('email')} />
          </Field>
          <Field t={t} label="asaas.fieldCpfCnpj" id="asaas-cpfCnpj" error={cpfCnpjError}>
            <Controller
              control={control}
              name="cpfCnpj"
              render={({ field }) => (
                <input
                  className={styles.input}
                  id="asaas-cpfCnpj"
                  inputMode="numeric"
                  value={formatCpfCnpj(field.value ?? '')}
                  onChange={(e) => field.onChange(digitsOnly(e.target.value).slice(0, 14))}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  // Field's generic aria wiring clones its `children` prop, but
                  // that's the <Controller> element here, not the rendered
                  // <input> -- so this field wires aria-invalid/describedby
                  // itself instead of relying on that.
                  aria-invalid={Boolean(cpfCnpjError)}
                  aria-describedby={cpfCnpjError ? 'asaas-cpfCnpj-error' : undefined}
                />
              )}
            />
          </Field>
          {isCnpj && (
            <Field
              t={t}
              label="asaas.fieldCompanyType"
              id="asaas-companyType"
              error={errors.companyType ? t('asaas.fieldRequired') : undefined}
            >
              <select id="asaas-companyType" className={styles.select} {...register('companyType')}>
                {/* Not `disabled`: a disabled first <option> makes the browser
                    auto-select the next enabled one as the default, so the
                    field would never actually be empty and "required" could
                    never fire. */}
                <option value="">{t('asaas.fieldCompanyTypePlaceholder')}</option>
                {Object.entries(COMPANY_TYPE_KEYS).map(([value, key]) => (
                  <option key={value} value={value}>
                    {t(key)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {isCpf && (
            <Field
              t={t}
              label="asaas.fieldBirthDate"
              id="asaas-birthDate"
              error={errors.birthDate ? t('asaas.fieldRequired') : undefined}
            >
              <input className={styles.input} id="asaas-birthDate" type="date" {...register('birthDate')} />
            </Field>
          )}
          <Field t={t} label="asaas.fieldMobilePhone" id="asaas-mobilePhone">
            <Controller
              control={control}
              name="mobilePhone"
              render={({ field }) => (
                <input
                  className={styles.input}
                  id="asaas-mobilePhone"
                  inputMode="numeric"
                  value={formatPhone(field.value ?? '')}
                  onChange={(e) => field.onChange(digitsOnly(e.target.value).slice(0, 11))}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </Field>
          <Field
            t={t}
            label="asaas.fieldIncomeValue"
            id="asaas-incomeValue"
            hint="asaas.fieldIncomeValueHint"
          >
            <Controller
              control={control}
              name="incomeValue"
              render={({ field }) => {
                const numeric = typeof field.value === 'number' ? field.value : Number(field.value);
                const cents = Number.isFinite(numeric) ? Math.round(numeric * 100) : 0;
                return (
                  <input
                    className={styles.input}
                    id="asaas-incomeValue"
                    inputMode="numeric"
                    value={cents ? formatBRLFromCents(cents) : ''}
                    onChange={(e) => field.onChange(digitsToCents(e.target.value) / 100)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                );
              }}
            />
          </Field>
        </div>

        <div className={styles.sectionLabel}>{t('asaas.sectionAddress')}</div>
        <div className={styles.grid}>
          <Field t={t} label="asaas.fieldPostalCode" id="asaas-postalCode">
            <Controller
              control={control}
              name="postalCode"
              render={({ field }) => (
                <input
                  className={styles.input}
                  id="asaas-postalCode"
                  inputMode="numeric"
                  value={formatPostalCode(field.value ?? '')}
                  onChange={(e) => field.onChange(digitsOnly(e.target.value).slice(0, 8))}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </Field>
          <Field t={t} label="asaas.fieldProvince" id="asaas-province">
            <input className={styles.input} id="asaas-province" {...register('province')} />
          </Field>
          <Field t={t} label="asaas.fieldAddress" id="asaas-address" full>
            <input className={styles.input} id="asaas-address" {...register('address')} />
          </Field>
          <Field t={t} label="asaas.fieldAddressNumber" id="asaas-addressNumber">
            <input className={styles.input} id="asaas-addressNumber" {...register('addressNumber')} />
          </Field>
          <Field t={t} label="asaas.fieldComplement" id="asaas-complement" optional>
            <input className={styles.input} id="asaas-complement" {...register('complement')} />
          </Field>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
            {t('asaas.cancelButton')}
          </Button>
          <Button type="submit" className={styles.cta} disabled={mutation.isPending}>
            {mutation.isPending ? t('asaas.submitting') : t('asaas.submitButton')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  t,
  label,
  id,
  children,
  full,
  optional,
  error,
  hint,
}: {
  t: Translate;
  label: string;
  id: string;
  children: ReactNode;
  full?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
}) {
  const errorId = `${id}-error`;
  const childWithAria = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
      })
    : children;

  return (
    <div className={styles.field} data-full={full || undefined}>
      <Label htmlFor={id} className={styles.fieldLabel}>
        {t(label)}
        {optional && <span className={styles.fieldOptional}> {t('asaas.fieldOptionalHint')}</span>}
      </Label>
      {childWithAria}
      {error && (
        <span id={errorId} className={styles.fieldError}>
          {error}
        </span>
      )}
      {hint && <span className={styles.fieldHint}>{t(hint)}</span>}
    </div>
  );
}
