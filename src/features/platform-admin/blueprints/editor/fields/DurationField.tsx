'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@live-show/design-system';
import { ChoiceSelect } from '../../../mailing/components/BlockInspector';
import styles from '../Inspector.module.scss';

const UNITS = ['m', 'h', 'd'] as const;
type Unit = (typeof UNITS)[number];

const DURATION = /^(\d+)([mhd])$/;

function parse(value?: string): { amount: number; unit: Unit } {
  const m = value ? DURATION.exec(value) : null;
  return m ? { amount: Number(m[1]), unit: m[2] as Unit } : { amount: 0, unit: 'h' };
}

interface Props {
  id: string;
  label: string;
  value?: string;
  onChange(value: string | undefined): void;
}

// Emits "2h" / "30m" / "1d" — the domain's simple duration expression.
export function DurationField({ id, label, value, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const { amount, unit } = parse(value);

  function change(patch: Partial<{ amount: number; unit: Unit }>) {
    const next = { amount: patch.amount ?? amount, unit: patch.unit ?? unit };
    onChange(next.amount > 0 ? `${next.amount}${next.unit}` : undefined);
  }

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>{label}</label>
      <div className={styles.durationRow}>
        <Input
          id={id}
          type="number"
          min={0}
          value={amount || ''}
          onChange={(e) => change({ amount: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
        />
        <ChoiceSelect
          id={`${id}-unit`}
          value={unit}
          options={UNITS.map((u) => ({ value: u, label: t(`editor.fields.durationUnit.${u}`) }))}
          onChange={(u) => change({ unit: u as Unit })}
        />
      </div>
    </div>
  );
}
