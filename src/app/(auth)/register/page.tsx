import type { Metadata } from 'next';
import { RegisterForm } from '@/features/account';
import { fetchFeatureFlags } from '@/features/feature-flags';

interface RegisterPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export const metadata: Metadata = { title: 'Criar conta' };

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const [{ redirect }, flags] = await Promise.all([searchParams, fetchFeatureFlags()]);
  return <RegisterForm callbackUrl={redirect} socialLoginEnabled={flags.social_login} />;
}
