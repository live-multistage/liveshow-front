import { Badge } from '@/shared/components/ui/badge';
import type { OrganizationStatus } from '../types/platform-admin.types';

const VARIANT_BY_STATUS: Record<OrganizationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'outline',
  ACTIVE: 'default',
  SUSPENDED: 'secondary',
  ARCHIVED: 'secondary',
  REJECTED: 'destructive',
};

const LABEL_BY_STATUS: Record<OrganizationStatus, string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativa',
  SUSPENDED: 'Suspensa',
  ARCHIVED: 'Arquivada',
  REJECTED: 'Rejeitada',
};

export function OrganizationStatusBadge({ status }: { status: OrganizationStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{LABEL_BY_STATUS[status]}</Badge>;
}
