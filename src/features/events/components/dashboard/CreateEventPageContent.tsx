'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { CreateEventForm } from './CreateEventForm';
import { MY_EVENTS_KEY } from '../../queries/get-my-events';
import styles from './CreateEventPageContent.module.scss';

export function CreateEventPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('createEvent');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => router.back()}>
          <ArrowLeft size={16} />
          {t('back')}
        </button>
        <div>
          <h1 className={styles.heading}>{t('heading')}</h1>
          <p className={styles.subheading}>{t('subheading')}</p>
        </div>
      </div>

      <div className={styles.body}>
        <CreateEventForm
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: MY_EVENTS_KEY });
            router.push('/dashboard/events');
          }}
        />
      </div>
    </div>
  );
}
