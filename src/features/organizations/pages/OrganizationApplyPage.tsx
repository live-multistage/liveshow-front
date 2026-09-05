'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/features/account/hooks/use-auth';
import { OrganizationForm } from '../components/OrganizationForm';
import { useCreateOrganization } from '../hooks/use-create-organization';
import styles from './OrganizationApplyPage.module.scss';

const APPLY_PATH = '/be-partner/apply';
const REGISTER_HREF = `/register?redirect=${encodeURIComponent(APPLY_PATH)}`;
const LOGIN_HREF = `/login?redirect=${encodeURIComponent(APPLY_PATH)}`;

export function OrganizationApplyContent() {
  const { isLoggedIn, isLoading } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const mutation = useCreateOrganization(() => setSubmitted(true));

  if (isLoading) return null;

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <CheckCircle2 size={40} className={styles.successIcon} />
          <h1 className={styles.heading}>Recebemos sua candidatura</h1>
          <p className={styles.subheading}>
            Sua organização foi enviada para análise. Assim que for aprovada, você será
            notificado e poderá acessar o painel para configurar seus eventos e transmissões.
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
          <h1 className={styles.heading}>Candidate sua organização</h1>
          <p className={styles.subheading}>
            Para enviar sua candidatura, entre na sua conta ou crie uma gratuitamente. Leva
            menos de um minuto e sua organização passa por uma análise rápida antes de ir ao ar.
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Seja um parceiro</p>
        <h1 className={styles.heading}>Candidate sua organização</h1>
        <p className={styles.subheading}>
          Preencha os dados abaixo. Sua organização será criada e passará por uma análise
          antes da aprovação — avisaremos assim que estiver liberada.
        </p>
      </div>

      <div className={styles.body}>
        <OrganizationForm
          onSubmit={(values) =>
            mutation.mutate({ name: values.name, slug: values.slug, description: values.description })
          }
          isPending={mutation.isPending}
          error={mutation.error?.message}
          submitLabel="Enviar candidatura"
        />
      </div>
    </div>
  );
}
