import type { Metadata } from 'next';
import { RegisterForm } from '@/features/account';

interface RegisterPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export const metadata: Metadata = { title: 'Criar conta' };

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { redirect } = await searchParams;
  return <RegisterForm callbackUrl={redirect} />;
}
