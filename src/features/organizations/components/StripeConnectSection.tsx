'use client';

import { ExternalLink, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useStripeStatus } from '../hooks/use-stripe-status';
import { useInitiateStripeConnect } from '../hooks/use-initiate-stripe-connect';
import styles from './StripeConnectSection.module.scss';

interface Props {
  orgId: string;
}

export function StripeConnectSection({ orgId }: Props) {
  const { data: status, isLoading, isError } = useStripeStatus(orgId);
  const connectMutation = useInitiateStripeConnect(orgId);

  if (isLoading) {
    return <p className={styles.loading}>Carregando status do Stripe...</p>;
  }

  if (isError || !status) {
    return (
      <p className={styles.error}>
        Não foi possível carregar o status do Stripe.
      </p>
    );
  }

  const handleConnect = () => connectMutation.mutate();

  if (!status.hasAccount) {
    return (
      <div className={styles.container}>
        <div className={styles.statusRow}>
          <span className={styles.badge} data-status="none">
            <AlertCircle size={11} />
            Não conectado
          </span>
        </div>
        <p className={styles.description}>
          Conecte uma conta Stripe para receber os pagamentos de ingresso diretamente.
        </p>
        {connectMutation.error && (
          <p className={styles.error}>{connectMutation.error.message}</p>
        )}
        <button
          className={styles.btn}
          onClick={handleConnect}
          disabled={connectMutation.isPending}
        >
          <ExternalLink size={14} />
          {connectMutation.isPending ? 'Redirecionando...' : 'Conectar Stripe'}
        </button>
      </div>
    );
  }

  if (!status.onboardingComplete) {
    return (
      <div className={styles.container}>
        <div className={styles.statusRow}>
          <span className={styles.badge} data-status="pending">
            <Clock size={11} />
            Pendente
          </span>
        </div>
        <p className={styles.description}>
          O cadastro no Stripe está incompleto. Continue para ativar os recebimentos.
        </p>
        {connectMutation.error && (
          <p className={styles.error}>{connectMutation.error.message}</p>
        )}
        <button
          className={styles.btn}
          onClick={handleConnect}
          disabled={connectMutation.isPending}
        >
          <ExternalLink size={14} />
          {connectMutation.isPending ? 'Redirecionando...' : 'Continuar configuração'}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.statusRow}>
        <span className={styles.badge} data-status="active">
          <CheckCircle2 size={11} />
          Ativo
        </span>
      </div>
      <p className={styles.description}>
        Sua conta Stripe está conectada. Os pagamentos de ingressos são transferidos automaticamente.
      </p>
      <div className={styles.feeRow}>
        <span className={styles.feeLabel}>Taxa da plataforma</span>
        <span className={styles.feeValue}>{status.platformFeeRate}%</span>
      </div>
    </div>
  );
}
