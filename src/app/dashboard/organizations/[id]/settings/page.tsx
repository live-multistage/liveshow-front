import { SettingsPage } from '@/features/organizations';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrganizationSettingsPage({ params }: Props) {
  const { id } = await params;
  return <SettingsPage organizationId={id} />;
}
