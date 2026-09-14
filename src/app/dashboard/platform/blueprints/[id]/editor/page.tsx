import type { Metadata } from 'next';
import { EditorPage } from '@/features/platform-admin/blueprints/editor/EditorPage';

export const metadata: Metadata = { title: 'Plataforma — Editor de blueprint' };

type SearchParams = Record<string, string | string[] | undefined>;
const single = (v: string | string[] | undefined) => (typeof v === 'string' && v ? v : undefined);

// Not flag-gated (spec D10), SUPER_ADMIN via the platform layout guard. Imported
// outside the feature barrel so React Flow stays out of the list/detail bundles.
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { id } = await params;
  const query = await searchParams;
  return <EditorPage id={id} versionId={single(query.version)} nodeId={single(query.node)} />;
}
