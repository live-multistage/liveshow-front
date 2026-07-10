import type { Metadata } from 'next';
import { LoginForm } from '@/features/account';

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect, error } = await searchParams;
  return <LoginForm callbackUrl={redirect} oauthError={error === 'google'} />;
}
