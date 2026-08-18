import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Logo } from '@live-show/design-system';
import styles from './Footer.module.scss';

// O e-mail já é público na página de privacidade — não é um canal novo, é o
// mesmo, alcançável de qualquer página.
const CONTACT_EMAIL = 'privacidade@liveshow.com';

/** Rodapé de todas as páginas com Navbar. */
const LINKS = [
  { key: 'terms', href: '/privacidade' },
  { key: 'contact', href: `mailto:${CONTACT_EMAIL}` },
  { key: 'help', href: '/help' },
] as const;

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className={styles.footer}>
      <div className={styles.brand}>
        {/* Mesmos props do Navbar, só menor: a marca do app é esta, não a do
            arquivo de design (que traz um logotipo antigo, de 5 barras). */}
        <Logo size={16} color="#ff2e9e" wordmarkClassName={styles.wordmark} />
      </div>

      <nav className={styles.links}>
        {LINKS.map(({ key, href }) =>
          // mailto: não é rota do app — o Link do Next assumiria navegação
          // client-side e o cliente de e-mail nunca abriria.
          href.startsWith('mailto:') ? (
            <a key={key} href={href} className={styles.link}>
              {t(key)}
            </a>
          ) : (
            <Link key={key} href={href} className={styles.link}>
              {t(key)}
            </Link>
          ),
        )}
        <span className={styles.copyright}>{t('copyright', { year: new Date().getFullYear() })}</span>
      </nav>
    </footer>
  );
}
