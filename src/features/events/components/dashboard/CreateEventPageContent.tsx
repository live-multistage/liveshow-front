'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { CreateEventForm } from './CreateEventForm';
import { MY_EVENTS_KEY } from '../../queries/get-my-events';
import styles from './CreateEventPageContent.module.scss';

export function CreateEventPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.back} onClick={() => router.back()}>
          <ArrowLeft size={16} />
          Eventos
        </button>
        <div>
          <h1 className={styles.heading}>Criar Evento</h1>
          <p className={styles.subheading}>Preencha as informações do seu evento</p>
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
