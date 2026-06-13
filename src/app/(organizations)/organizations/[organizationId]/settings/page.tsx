import { SettingsPage } from '@/features/organizations';

interface Props {
  params: Promise<{ organizationId: string }>;
}

export default async function OrganizationSettingsPage({ params }: Props) {
  const { organizationId } = await params;
  return <SettingsPage organizationId={organizationId} />;
}
