import type { Metadata } from 'next';
import { VerifyEmailContent } from '@/features/account';

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export const metadata: Metadata = { title: 'Confirmação de e-mail' };

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams;
  return <VerifyEmailContent token={token} />;
}
