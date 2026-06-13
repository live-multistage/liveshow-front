import { OrganizationPublicPage } from '@/features/organizations';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  return <OrganizationPublicPage slug={slug} />;
}
