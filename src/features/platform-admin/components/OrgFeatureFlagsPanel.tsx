'use client';

import { toast } from 'sonner';
import { Switch } from '@/shared/components/ui/switch';
import { useOrgFeatureFlagsQuery } from '../queries/get-org-feature-flags';
import { useSetOrgFeatureFlagMutation } from '../mutations/set-org-feature-flag.mutation';
import styles from './OrgFeatureFlagsPanel.module.scss';

export function OrgFeatureFlagsPanel({ organizationId }: { organizationId: string }) {
  const { data, isLoading, isError } = useOrgFeatureFlagsQuery(organizationId);
  const setFlag = useSetOrgFeatureFlagMutation(organizationId);

  if (isLoading) return <div className={styles.empty}>Carregando feature flags...</div>;
  if (isError || !data) return <div className={styles.empty}>Erro ao carregar feature flags.</div>;

  return (
    <div className={styles.list}>
      {data.map((flag) => (
        <div className={styles.card} key={flag.key}>
          <div>
            <div className={styles.labelRow}>
              <span className={styles.label}>{flag.key}</span>
              <span className={flag.isOverride ? `${styles.tag} ${styles.tagOverride}` : `${styles.tag} ${styles.tagGlobal}`}>
                {flag.isOverride ? 'OVERRIDE' : 'USANDO PADRÃO GLOBAL'}
              </span>
            </div>
          </div>
          <Switch
            checked={flag.enabled}
            disabled={setFlag.isPending}
            onCheckedChange={(checked) =>
              setFlag.mutate(
                { key: flag.key, enabled: checked },
                { onSuccess: () => toast.success(`${flag.key} ${checked ? 'ativado' : 'desativado'} para esta organização.`) },
              )
            }
          />
        </div>
      ))}
    </div>
  );
}
