'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/features/account/hooks/use-auth';
import { useCreateOrganizerApplication } from '../hooks/use-create-organizer-application';
import type { OrganizerSegment } from '../types/organization.types';
import styles from './OrganizerApplicationPage.module.scss';

const APPLY_PATH = '/be-partner/apply';
const REGISTER_HREF = `/register?redirect=${encodeURIComponent(APPLY_PATH)}`;
const LOGIN_HREF = `/login?redirect=${encodeURIComponent(APPLY_PATH)}`;

const SEGMENT_OPTIONS: { value: OrganizerSegment; label: string }[] = [
  { value: 'MUSIC_FESTIVAL', label: 'Música / Festival' },
  { value: 'THEATER', label: 'Teatro' },
  { value: 'COMEDY_STANDUP', label: 'Comédia / Stand-up' },
  { value: 'SPORTS', label: 'Esporte' },
  { value: 'CORPORATE_EVENTS', label: 'Corporativo / Eventos' },
  { value: 'EDUCATION', label: 'Educação' },
  { value: 'RELIGIOUS', label: 'Religioso' },
  { value: 'OTHER', label: 'Outro' },
];

export function OrganizerApplicationContent() {
  const { isLoggedIn, isLoading } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [segment, setSegment] = useState<OrganizerSegment | ''>('');
  const [customSegment, setCustomSegment] = useState('');
  const [description, setDescription] = useState('');
  const mutation = useCreateOrganizerApplication(() => setSubmitted(true));

  if (isLoading) return null;

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <CheckCircle2 size={40} className={styles.successIcon} />
          <h1 className={styles.heading}>Recebemos sua candidatura</h1>
          <p className={styles.subheading}>
            Sua candidatura para se tornar um organizador foi enviada para análise. Assim que
            for aprovada, você será notificado e poderá acessar o painel para configurar seus
            eventos e transmissões.
          </p>
          <Link href="/be-partner" className={styles.secondary}>
            Voltar para a página de parceiros →
          </Link>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Seja um parceiro</p>
          <h1 className={styles.heading}>Candidate-se a organizador</h1>
          <p className={styles.subheading}>
            Para enviar sua candidatura, entre na sua conta ou crie uma gratuitamente. Leva
            menos de um minuto e sua candidatura passa por uma análise rápida antes da aprovação.
          </p>
        </div>
        <div className={styles.actions}>
          <Link href={REGISTER_HREF} className={styles.primary}>
            Criar conta e continuar
            <ArrowRight size={16} />
          </Link>
          <Link href={LOGIN_HREF} className={styles.secondary}>
            Já tenho conta →
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!segment) return;
    mutation.mutate({
      description,
      segment,
      ...(segment === 'OTHER' ? { customSegment } : {}),
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Seja um parceiro</p>
        <h1 className={styles.heading}>Candidate-se a organizador</h1>
        <p className={styles.subheading}>
          Conte um pouco sobre você e o que pretende transmitir. Sua candidatura passará por
          uma análise antes da aprovação — avisaremos assim que estiver liberada.
        </p>
      </div>

      <div className={styles.body}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="segment" className={styles.label}>
              Segmento *
            </label>
            <select
              id="segment"
              required
              value={segment}
              onChange={(e) => setSegment(e.target.value as OrganizerSegment)}
              className={styles.input}
            >
              <option value="" disabled>
                Selecione um segmento
              </option>
              {SEGMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {segment === 'OTHER' && (
            <div className={styles.field}>
              <label htmlFor="customSegment" className={styles.label}>
                Descreva seu segmento *
              </label>
              <input
                id="customSegment"
                required
                value={customSegment}
                onChange={(e) => setCustomSegment(e.target.value)}
                className={styles.input}
                placeholder="Ex: Podcast ao vivo"
              />
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Conte sobre você e o que pretende transmitir *
            </label>
            <textarea
              id="description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${styles.input} ${styles.textarea}`}
              rows={5}
            />
          </div>

          {mutation.error && (
            <p className={`${styles.error} ${styles.globalError}`}>{mutation.error.message}</p>
          )}

          <div className={styles.formActions}>
            <button type="submit" className={styles.submit} disabled={mutation.isPending}>
              {mutation.isPending ? 'Enviando...' : 'Enviar candidatura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
