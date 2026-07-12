'use client';

import { Switch } from '@/shared/components/ui/switch';
import { useOrgFeatureFlagsQuery } from '../queries/get-org-feature-flags';
import { useSetOrgFeatureFlagMutation } from '../mutations/set-org-feature-flag.mutation';

export function OrgFeatureFlagsPanel({ organizationId }: { organizationId: string }) {
  const { data, isLoading, isError } = useOrgFeatureFlagsQuery(organizationId);
  const setFlag = useSetOrgFeatureFlagMutation(organizationId);

  if (isLoading) return <p>Carregando feature flags...</p>;
  if (isError || !data) return <p>Erro ao carregar feature flags.</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {data.map((flag) => (
        <div key={flag.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontWeight: 500 }}>{flag.key}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
              {flag.isOverride ? 'Configuração específica desta organização' : 'Usando o padrão global'}
            </p>
          </div>
          <Switch
            checked={flag.enabled}
            disabled={setFlag.isPending}
            onCheckedChange={(checked) => setFlag.mutate({ key: flag.key, enabled: checked })}
          />
        </div>
      ))}
    </div>
  );
}
