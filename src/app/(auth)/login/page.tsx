import type { Metadata } from 'next';
import { LoginForm } from '@/features/account';
import { fetchFeatureFlags } from '@/features/feature-flags';

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ redirect, error }, flags] = await Promise.all([searchParams, fetchFeatureFlags()]);
  return (
    <LoginForm
      callbackUrl={redirect}
      oauthError={error === 'google'}
      socialLoginEnabled={flags.social_login}
    />
  );
}
