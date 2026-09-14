import type { Metadata } from 'next';
import { BlueprintDetailPage } from '@/features/platform-admin/blueprints';

export const metadata: Metadata = { title: 'Plataforma — Blueprint' };

// Not flag-gated (spec D10): see ../page.tsx.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BlueprintDetailPage id={id} />;
}
