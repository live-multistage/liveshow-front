import type { Metadata } from 'next';
import styles from './page.module.scss';

export const metadata: Metadata = { title: 'Redefinir senha' };

export default function ResetPasswordPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Reset Password</h1>
      <p className={styles.subtitle}>Em breve</p>
    </div>
  );
}
