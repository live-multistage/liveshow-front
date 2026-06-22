'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { User, Lock } from 'lucide-react';
import { getMe } from '../queries/get-me';
import { useUpdateProfileMutation } from '../mutations/update-profile.mutation';
import { useChangePasswordMutation } from '../mutations/change-password.mutation';
import { updateProfileSchema, type UpdateProfileFormValues } from '../schemas/update-profile.schema';
import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas/change-password.schema';
import styles from './SettingsPageContent.module.scss';

export function SettingsPageContent() {
  const t = useTranslations('settings');

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 60_000,
  });

  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const profileForm = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { displayName: '' },
  });

  useEffect(() => {
    if (me?.displayName) {
      profileForm.reset({ displayName: me.displayName });
    }
  }, [me, profileForm]);

  const updateProfile = useUpdateProfileMutation();
  const changePassword = useChangePasswordMutation();

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  });

  function onProfileSubmit(values: UpdateProfileFormValues) {
    setProfileSuccess(false);
    updateProfile.mutate(values, {
      onSuccess: () => {
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 4000);
      },
    });
  }

  function onPasswordSubmit({ currentPassword, newPassword }: ChangePasswordFormValues) {
    setPasswordSuccess(false);
    changePassword.mutate({ currentPassword, newPassword }, {
      onSuccess: () => {
        passwordForm.reset();
        setPasswordSuccess(true);
        setTimeout(() => setPasswordSuccess(false), 4000);
      },
    });
  }

  const passwordError = (() => {
    if (!changePassword.error) return null;
    const msg = changePassword.error.message;
    if (msg === 'WRONG_CURRENT_PASSWORD') return t('password.errorWrongCurrent');
    return t('password.errorGeneric');
  })();

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <span className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.heading}>{t('heading')}</h1>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <User size={18} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>{t('profile.title')}</h2>
          </div>
          <div className={styles.card}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>{t('profile.email')}</label>
                <input
                  type="email"
                  value={me?.email ?? ''}
                  disabled
                  className={styles.inputDisabled}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t('profile.displayName')}</label>
                <input
                  type="text"
                  disabled={updateProfile.isPending}
                  className={styles.input}
                  {...profileForm.register('displayName')}
                />
                {profileForm.formState.errors.displayName && (
                  <span className={styles.fieldError}>
                    {profileForm.formState.errors.displayName.message}
                  </span>
                )}
              </div>
              {updateProfile.error && (
                <p className={styles.errorBanner}>{updateProfile.error.message}</p>
              )}
              {profileSuccess && (
                <p className={styles.successBanner}>{t('profile.success')}</p>
              )}
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className={styles.btnSubmit}
              >
                {updateProfile.isPending ? t('profile.saving') : t('profile.save')}
              </button>
            </form>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Lock size={18} className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>{t('password.title')}</h2>
          </div>
          <div className={styles.card}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>{t('password.current')}</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  disabled={changePassword.isPending}
                  className={styles.input}
                  {...passwordForm.register('currentPassword')}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <span className={styles.fieldError}>
                    {passwordForm.formState.errors.currentPassword.message}
                  </span>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t('password.new')}</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={changePassword.isPending}
                  className={styles.input}
                  {...passwordForm.register('newPassword')}
                />
                {passwordForm.formState.errors.newPassword && (
                  <span className={styles.fieldError}>
                    {passwordForm.formState.errors.newPassword.message}
                  </span>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>{t('password.confirm')}</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  disabled={changePassword.isPending}
                  className={styles.input}
                  {...passwordForm.register('confirmNewPassword')}
                />
                {passwordForm.formState.errors.confirmNewPassword && (
                  <span className={styles.fieldError}>
                    {passwordForm.formState.errors.confirmNewPassword.message}
                  </span>
                )}
              </div>
              {passwordError && <p className={styles.errorBanner}>{passwordError}</p>}
              {passwordSuccess && (
                <p className={styles.successBanner}>{t('password.success')}</p>
              )}
              <button
                type="submit"
                disabled={changePassword.isPending}
                className={styles.btnSubmit}
              >
                {changePassword.isPending ? t('password.saving') : t('password.save')}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
