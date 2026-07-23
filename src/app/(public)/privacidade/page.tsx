import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './page.module.scss';

export const metadata: Metadata = { title: 'Política de Privacidade' };

// ponytail: DPO contact is a placeholder — swap for the real encarregado/e-mail
// before launch. Everything else reflects what the platform actually collects.
const DPO_EMAIL = 'privacidade@liveshow.com';

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Política de Privacidade</h1>
        <p className={styles.updated}>Em conformidade com a LGPD (Lei nº 13.709/2018).</p>

        <section className={styles.section}>
          <h2>Dados que coletamos</h2>
          <p>
            <strong>Essenciais</strong> — necessários para prestar o serviço e cumprir
            obrigações legais: cadastro e autenticação, pagamentos e ingressos, e a
            contagem de espectadores ao vivo (que também controla a transmissão das câmeras).
          </p>
          <p>
            <strong>Não essenciais</strong> — coletados apenas com o seu consentimento:
            comportamento de navegação (páginas vistas, buscas, curtidas, itens no carrinho,
            trocas de câmera) e o perfil de interesses derivado desses eventos para
            personalizar recomendações.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Base legal</h2>
          <p>
            Dados essenciais: execução de contrato e obrigação legal (Art. 7, V e II).
            Dados não essenciais: consentimento (Art. 7, I), que você pode conceder ou
            revogar a qualquer momento sem prejuízo do acesso ao serviço.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Seus direitos (Art. 18)</h2>
          <p>
            Você pode acessar, exportar e excluir seus dados, além de revogar o
            consentimento, em{' '}
            <Link href="/settings#privacidade" className={styles.link}>Configurações → Privacidade</Link>.
            A exclusão remove o histórico de uso e o perfil de recomendações; dados de
            compras e ingressos são mantidos pelo prazo legal aplicável.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Retenção</h2>
          <p>
            Eventos de uso não essenciais são mantidos por até 12 meses e depois
            eliminados automaticamente. Dados contratuais seguem os prazos fiscais e
            legais correspondentes.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Encarregado (DPO)</h2>
          <p>
            Dúvidas ou solicitações sobre seus dados:{' '}
            <a href={`mailto:${DPO_EMAIL}`} className={styles.link}>{DPO_EMAIL}</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
