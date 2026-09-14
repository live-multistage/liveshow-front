'use client';

import { useTranslations } from 'next-intl';
import {
  CustomSelect, CustomSelectContent, CustomSelectItem, CustomSelectTrigger, CustomSelectValue, Input, cn,
} from '@live-show/design-system';
import { useMailingTemplatesQuery } from '../../../mailing/queries/mailing.queries';
import styles from '../Inspector.module.scss';

// "Template de e-mail" (mailing.sendEmail.templateId): the mailing templates
// with TESTADO / NÃO TESTADO (tested = last test on the current version) and
// the category. Falls back to a plain uuid input if the list fails to load.
export function TemplateSelect({ id, value, onChange }: { id: string; value: string; onChange(value: string): void }) {
  const t = useTranslations('platformAdmin.blueprints');
  const tm = useTranslations('platformAdmin.mailing');
  const { data, isLoading, isError } = useMailingTemplatesQuery();

  if (isError) return <Input id={id} className={styles.mono} value={value} onChange={(e) => onChange(e.target.value.trim())} />;

  const selected = data?.find((tpl) => tpl.id === value);

  return (
    <>
      <CustomSelect value={selected ? value : ''} onValueChange={(v) => v && onChange(v)} disabled={isLoading}>
        <CustomSelectTrigger id={id} className={styles.selectTrigger}>
          <CustomSelectValue placeholder={t('editor.template.placeholder')} />
        </CustomSelectTrigger>
        <CustomSelectContent>
          {(data ?? []).map((tpl) => {
            const tested = tpl.lastTestedVersion === tpl.version;
            return (
              <CustomSelectItem key={tpl.id} value={tpl.id}>
                <span className={styles.option}>
                  {tpl.name}
                  <span className={cn(styles.chip, tested ? styles.chipTested : styles.chipPersonal)}>
                    {tm(tested ? 'templates.tested' : 'templates.untested')}
                  </span>
                </span>
              </CustomSelectItem>
            );
          })}
        </CustomSelectContent>
      </CustomSelect>
      {selected && <p className={styles.help}>{t('editor.template.category', { category: tm(`category.${selected.category}`) })}</p>}
      {value && data && !selected && <p className={styles.stale}>{t('editor.template.notFound', { id: value })}</p>}
    </>
  );
}
