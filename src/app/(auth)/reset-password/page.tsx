import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/account';

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export const metadata: Metadata = { title: 'Redefinir senha', referrer: 'no-referrer' };

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token} />;
}
