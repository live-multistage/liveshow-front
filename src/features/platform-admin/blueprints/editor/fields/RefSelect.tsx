'use client';

import { useTranslations } from 'next-intl';
import type { BlueprintFieldClass, BlueprintOutputField } from '@live-show/api-contracts';
import {
  CustomSelect, CustomSelectContent, CustomSelectGroup, CustomSelectItem, CustomSelectLabel, CustomSelectTrigger, CustomSelectValue, cn,
} from '@live-show/design-system';
import { refOf } from '../expr-builders';
import { typeLabel } from '../field-types';
import type { AvailableField } from '../useEditorGraph';
import styles from '../Inspector.module.scss';

const CHIP: Record<BlueprintFieldClass, string> = { PUBLIC: styles.chipPublic, INTERNAL: styles.chipInternal, PERSONAL: styles.chipPersonal };

export function ClassChip({ cls }: { cls: BlueprintFieldClass }) {
  const t = useTranslations('platformAdmin.blueprints');
  return (
    <span className={cn(styles.chip, CHIP[cls])} title={cls === 'PERSONAL' ? t('editor.fields.personalTooltip') : undefined}>
      {t(`editor.classification.${cls}`)}
    </span>
  );
}

function TypeChip({ type }: { type: AvailableField['out']['type'] }) {
  return <span className={cn(styles.chip, styles.typeChip)}>{type === 'json' ? 'JSON' : typeLabel(type)}</span>;
}

const DEPTH_CLASS = [undefined, 'optionDepth1', 'optionDepth2', 'optionDepth3'] as const;
const pathKey = (f: AvailableField) => [f.field, ...f.path].join('.');

interface Props {
  id: string;
  value: string;
  fields: AvailableField[];
  /** Returns why a field cannot go here (shown next to the disabled option), or null. */
  reject(out: BlueprintOutputField): string | null;
  onChange(value: string): void;
}

// "Referência": upstream outputs grouped by node (`h · REQUISIÇÃO HTTP`), each
// row indented by its path depth with a leaf/type chip; incompatible ones
// stay listed, disabled, with the reason underneath. Port-scoped outputs
// (e.g. an action's error port) render below a dedicated sub-header.
export function RefSelect({ id, value, fields, reject, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const byNode = new Map<string, AvailableField[]>();
  for (const f of fields) byNode.set(f.nodeId, [...(byNode.get(f.nodeId) ?? []), f]);
  const known = fields.some((f) => refOf(f.nodeId, f.field, f.path) === value);

  const renderItem = (f: AvailableField) => {
    const reason = reject(f.out);
    const depthKey = DEPTH_CLASS[Math.min(f.depth, 3)];
    const depthClass = depthKey ? styles[depthKey] : undefined;
    return (
      <CustomSelectItem key={pathKey(f)} value={refOf(f.nodeId, f.field, f.path)} disabled={reason !== null}>
        <span className={cn(styles.option, depthClass)}>
          <span className={styles.mono}>{pathKey(f)}</span>
          <TypeChip type={f.out.type} />
          <ClassChip cls={f.out.class} />
          {reason && <span className={styles.reason}>{reason}</span>}
        </span>
      </CustomSelectItem>
    );
  };

  return (
    <>
      <CustomSelect value={known ? value : ''} onValueChange={(v) => v && onChange(v)}>
        <CustomSelectTrigger id={id} className={styles.selectTrigger}>
          <CustomSelectValue placeholder={fields.length ? t('editor.fields.selectField') : t('editor.fields.noUpstream')} />
        </CustomSelectTrigger>
        <CustomSelectContent>
          {[...byNode.entries()].map(([nodeId, list]) => {
            const sorted = [...list].sort((a, b) => pathKey(a).localeCompare(pathKey(b)));
            const normal = sorted.filter((f) => !f.out.port);
            const ported = sorted.filter((f) => f.out.port);
            return (
              <CustomSelectGroup key={nodeId}>
                <CustomSelectLabel className={styles.optionGroup}>{nodeId} · {list[0].nodeLabel}</CustomSelectLabel>
                {normal.map(renderItem)}
                {ported.length > 0 && (
                  <CustomSelectLabel className={styles.errorPortHeader}>{t('editor.fields.errorPortSection')}</CustomSelectLabel>
                )}
                {ported.map(renderItem)}
              </CustomSelectGroup>
            );
          })}
        </CustomSelectContent>
      </CustomSelect>
      {value && !known && <p className={styles.stale}>{value}</p>}
    </>
  );
}
