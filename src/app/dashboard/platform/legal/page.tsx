import type { Metadata } from 'next';
import { LegalDocumentsPage } from '@/features/platform-admin/legal/components/LegalDocumentsPage';

export const metadata: Metadata = { title: 'Plataforma — Documentos legais' };

export default function Page() {
  return <LegalDocumentsPage />;
}
