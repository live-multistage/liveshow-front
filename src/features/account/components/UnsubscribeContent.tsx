'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUnsubscribeMutation } from '../mutations/use-unsubscribe.mutation';
import { EmailStatusCard } from './EmailStatusCard';

type State = 'working' | 'success' | 'invalid';

export function UnsubscribeContent({ token }: { token?: string }) {
  const t = useTranslations('unsubscribe');
  const [state, setState] = useState<State>(token ? 'working' : 'invalid');
  // StrictMode runs effects twice in dev; one POST is enough (it is idempotent anyway).
  const calledRef = useRef(false);
  const { mutate } = useUnsubscribeMutation({
    onSuccess: () => setState('success'),
    onError: () => setState('invalid'),
  });

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;
    mutate(token);
  }, [token, mutate]);

  if (state === 'working') {
    return (
      <EmailStatusCard
        variant="loading"
        eyebrow={t('loading.eyebrow')}
        title={t('loading.title')}
        message={t('loading.message')}
        iconLabel={t('loading.spinnerLabel')}
        primaryAction={{ label: t('loading.action'), disabled: true }}
        protectedLabel={t('protectedBadge')}
      />
    );
  }

  const key = state === 'success' ? 'success' : 'invalid';
  return (
    <EmailStatusCard
      variant={state === 'success' ? 'success' : 'expired'}
      eyebrow={t(`${key}.eyebrow`)}
      title={t(`${key}.title`)}
      message={t(`${key}.message`)}
      primaryAction={{ label: t(`${key}.primary`), href: '/settings' }}
      secondaryAction={{ label: t(`${key}.secondary`), href: '/' }}
      protectedLabel={t('protectedBadge')}
    />
  );
}
