'use client';

import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import type { JsonLdMode } from '@live-show/api-contracts';
import { Button, Switch, Tooltip, TooltipContent, TooltipTrigger } from '@live-show/design-system';
import { checkJsonLd, declaredJsonLdTypes } from '../utils/check-jsonld';
import { MAX_JSONLD_BLOCKS, formatJson, type SeoForm } from '../utils/seo-form';
import { JsonLdBlock } from './JsonLdBlock';
import common from './SeoCommon.module.scss';
import styles from './JsonLdSection.module.scss';

interface Props {
  generatedTypes: readonly string[];
  // Effective mode (an override with no mode of its own passes the template's).
  mode: JsonLdMode;
  starter: string;
  vars: readonly string[];
  form: SeoForm;
  errors: Record<string, string>;
  onChange: (patch: Partial<SeoForm>) => void;
}

export function JsonLdSection({ generatedTypes, mode, starter, vars, form, errors, onChange }: Props) {
  const t = useTranslations('platformAdmin.seo.editor.jsonld');
  const atLimit = form.blocks.length >= MAX_JSONLD_BLOCKS;
  const replace = mode === 'REPLACE';
  const declared = new Set(form.blocks.flatMap(declaredJsonLdTypes));

  const setBlock = (i: number, text: string) => onChange({ blocks: form.blocks.map((b, j) => (j === i ? text : b)) });
  const toggleGenerated = (type: string, on: boolean) =>
    onChange({
      disabledGenerated: on
        ? form.disabledGenerated.filter((x) => x !== type)
        : [...form.disabledGenerated, type],
    });

  return (
    <section className={common.card}>
      <div>
        <div className={common.eyebrow}>{t('eyebrow')}</div>
        <div className={common.cardTitle}>{t('title')}</div>
      </div>

      {generatedTypes.length > 0 && (
        <div className={common.field}>
          <div className={common.labelRow}>
            <span className={common.eyebrow}>{t('auto')}</span>
            {replace && <span className={styles.note}>{t('ignoredInReplace')}</span>}
          </div>
          {generatedTypes.map((type) => {
            const replacedByBlock = !replace && declared.has(type);
            const on = !replacedByBlock && !form.disabledGenerated.includes(type);
            return (
              <div key={type} className={styles.auto} data-dimmed={replace}>
                <div>
                  <div className={styles.type}>
                    {type}
                    {replacedByBlock && <span className={styles.replaced}>{t('replacedByBlock')}</span>}
                  </div>
                  <div className={common.hint}>{on ? t(`autoDesc.${type}`) : t('autoOff')}</div>
                </div>
                <Switch checked={on} disabled={replace || replacedByBlock} aria-label={type} onCheckedChange={(v) => toggleGenerated(type, v)} />
              </div>
            );
          })}
        </div>
      )}

      <div className={common.field}>
        <div className={common.labelRow}>
          <span className={common.eyebrow}>{t('extra')}</span>
          <span className={common.counter}>{form.blocks.length}/{MAX_JSONLD_BLOCKS}</span>
        </div>
        {form.blocks.map((text, i) => (
          <JsonLdBlock
            key={i}
            n={i + 1}
            text={text}
            check={checkJsonLd(text, vars)}
            serverError={errors[`extraJsonLd[${i}]`]}
            onChange={(v) => setBlock(i, v)}
            onFormat={() => setBlock(i, formatJson(text))}
            onRemove={() => onChange({ blocks: form.blocks.filter((_, j) => j !== i) })}
          />
        ))}
        <div className={styles.addRow}>
          <Tooltip open={atLimit ? undefined : false}>
            <TooltipTrigger asChild>
              <span tabIndex={atLimit ? 0 : -1}>
                <Button variant="outline" size="sm" disabled={atLimit} onClick={() => onChange({ blocks: [...form.blocks, ''] })}>
                  <Plus size={13} /> {t('add')}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{t('max')}</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" disabled={atLimit} onClick={() => onChange({ blocks: [...form.blocks, starter] })}>
            {t('insertTemplate')}
          </Button>
          <span className={common.hint}>
            {t('help')} <code className={common.mono}>{'"name": "{{site.name}}"'}</code>
          </span>
        </div>
      </div>
    </section>
  );
}
