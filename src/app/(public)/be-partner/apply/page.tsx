import type { Metadata } from 'next';
import { OrganizationApplyContent } from '@/features/organizations/pages/OrganizationApplyPage';

export const metadata: Metadata = {
  title: 'Candidate sua organização',
  description: 'Envie sua organização para análise e comece a transmitir seus eventos.',
  alternates: { canonical: '/be-partner/apply' },
  robots: { index: false },
};

export default function OrganizationApplyPage() {
  return <OrganizationApplyContent />;
}
