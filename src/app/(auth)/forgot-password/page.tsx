import type { Metadata } from 'next';
import styles from './page.module.scss';

export const metadata: Metadata = { title: 'Recuperar senha' };

export default function ForgotPasswordPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Forgot Password</h1>
      <p className={styles.subtitle}>Em breve</p>
    </div>
  );
}
