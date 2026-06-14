import type { Metadata } from 'next';
import { LoginForm } from '@/features/account';

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl } = await searchParams;
  return <LoginForm callbackUrl={callbackUrl} />;
}
