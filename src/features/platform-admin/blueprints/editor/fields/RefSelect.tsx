'use client';

import { useTranslations } from 'next-intl';
import type { BlueprintFieldClass, BlueprintOutputField } from '@live-show/api-contracts';
import {
  CustomSelect, CustomSelectContent, CustomSelectGroup, CustomSelectItem, CustomSelectLabel, CustomSelectTrigger, CustomSelectValue, cn,
} from '@live-show/design-system';
import { refOf } from '../expr-builders';
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

interface Props {
  id: string;
  value: string;
  fields: AvailableField[];
  /** Returns why a field cannot go here (shown next to the disabled option), or null. */
  reject(out: BlueprintOutputField): string | null;
  onChange(value: string): void;
}

// "Referência": upstream outputs grouped by node (`t · Pedido pago → eventId`),
// each with its classification chip; incompatible ones stay listed, disabled.
export function RefSelect({ id, value, fields, reject, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const byNode = new Map<string, AvailableField[]>();
  for (const f of fields) byNode.set(f.nodeId, [...(byNode.get(f.nodeId) ?? []), f]);
  const known = fields.some((f) => refOf(f.nodeId, f.field) === value);

  return (
    <>
      <CustomSelect value={known ? value : ''} onValueChange={(v) => v && onChange(v)}>
        <CustomSelectTrigger id={id} className={styles.selectTrigger}>
          <CustomSelectValue placeholder={fields.length ? t('editor.fields.selectField') : t('editor.fields.noUpstream')} />
        </CustomSelectTrigger>
        <CustomSelectContent>
          {[...byNode.entries()].map(([nodeId, list]) => (
            <CustomSelectGroup key={nodeId}>
              <CustomSelectLabel className={styles.optionGroup}>{nodeId} · {list[0].nodeLabel}</CustomSelectLabel>
              {list.map((f) => {
                const reason = reject(f.out);
                return (
                  <CustomSelectItem key={f.field} value={refOf(f.nodeId, f.field)} disabled={reason !== null}>
                    <span className={styles.option}>
                      <span className={styles.mono}>{f.nodeId} · {f.nodeLabel} → {f.field}</span>
                      <ClassChip cls={f.out.class} />
                      {reason && <span className={styles.reason}>{reason}</span>}
                    </span>
                  </CustomSelectItem>
                );
              })}
            </CustomSelectGroup>
          ))}
        </CustomSelectContent>
      </CustomSelect>
      {value && !known && <p className={styles.stale}>{value}</p>}
    </>
  );
}
