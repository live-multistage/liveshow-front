'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CustomSelect, CustomSelectContent, CustomSelectItem, CustomSelectTrigger, CustomSelectValue } from '@live-show/design-system';
import { useBlueprintSecretsQuery } from '../../queries/blueprint-secrets.queries';
import styles from '../Inspector.module.scss';

interface Props {
  id?: string;
  value: string;
  onChange(value: string): void;
}

// "Segredo" (kind: 'secret'): picks a name registered in the platform
// settings secret store; the runtime resolves the value at execution time.
export function SecretSelect({ id, value, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const { data } = useBlueprintSecretsQuery();
  const secrets = data ?? [];
  const known = secrets.some((s) => s.name === value);

  return (
    <>
      <CustomSelect value={known ? value : ''} onValueChange={(v) => v && onChange(v)} disabled={secrets.length === 0}>
        <CustomSelectTrigger id={id} className={styles.selectTrigger}>
          <CustomSelectValue placeholder={secrets.length ? t('editor.fields.selectField') : t('editor.fields.noSecrets')}>
            {known && <span className={styles.mono}>{value}</span>}
          </CustomSelectValue>
        </CustomSelectTrigger>
        <CustomSelectContent>
          {secrets.map((s) => (
            <CustomSelectItem key={s.name} value={s.name}>
              <span className={styles.mono}>{s.name}</span>
            </CustomSelectItem>
          ))}
        </CustomSelectContent>
      </CustomSelect>
      <Link href="/dashboard/platform/settings#blueprints-http" className={styles.linkBtn}>
        {t('editor.fields.secretsManage')}
      </Link>
    </>
  );
}
