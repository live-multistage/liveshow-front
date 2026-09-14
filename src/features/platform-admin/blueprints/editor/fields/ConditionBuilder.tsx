'use client';

import { Fragment, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { BlueprintFieldType } from '@live-show/api-contracts';
import { Input, cn } from '@live-show/design-system';
import { ChoiceSelect } from '../../../mailing/components/BlockInspector';
import {
  RULE_OPS, conditionToRules, isCompleteRule, parseRef, rulesToCondition, type Operand, type Rule, type RuleOp, type RuleSet,
} from '../expr-builders';
import type { AvailableField } from '../useEditorGraph';
import { RefSelect } from './RefSelect';
import styles from '../Inspector.module.scss';

interface Props {
  id: string;
  value: unknown;
  fields: AvailableField[];
  onChange(value: unknown): void;
}

// "Condição": rows "campo · operador · valor" joined by one E/OU, emitting the
// core.condition shape ({ and|or: [{ eq: [ref, value] }, …] }). Expressions
// the flat builder cannot show (not / in / nesting) fall back to raw JSON.
export function ConditionBuilder({ id, value, fields, onChange }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  // Local draft keeps incomplete rows visible across renders — rulesToCondition
  // drops them, so the committed `value` alone can't tell an in-progress row
  // from a removed one (same pattern as WaitUntilBuilder's draft).
  const [draft, setDraft] = useState<RuleSet | null>(() => conditionToRules(value));
  if (!draft) return <RawCondition id={id} value={value} onChange={onChange} />;

  const emit = (next: RuleSet) => {
    setDraft(next);
    onChange(rulesToCondition(next));
  };
  const update = (i: number, patch: Partial<Rule>) => emit({ ...draft, rules: draft.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const typeOf = (left: string): BlueprintFieldType | undefined => {
    const ref = parseRef(left);
    return fields.find((f) => ref && f.nodeId === ref.nodeId && f.field === ref.field)?.out.type;
  };

  return (
    <div className={styles.rules} id={id}>
      {draft.rules.map((rule, i) => {
        const incomplete = !isCompleteRule(rule);
        return (
          <Fragment key={i}>
            {i > 0 && (
              <button type="button" className={styles.join} onClick={() => emit({ ...draft, join: draft.join === 'and' ? 'or' : 'and' })}>
                {t(`editor.condition.${draft.join}`)}
              </button>
            )}
            <div className={cn(styles.rule, incomplete && styles.ruleIncomplete)}>
              <RefSelect
                id={`${id}-field-${i}`}
                value={rule.left}
                fields={fields}
                reject={(out) => (out.class === 'PERSONAL' ? t('editor.fields.personalNotAllowed') : null)}
                onChange={(left) => update(i, { left })}
              />
              <div className={styles.ruleRow}>
                <ChoiceSelect
                  id={`${id}-op-${i}`}
                  value={rule.op}
                  options={RULE_OPS.map((op) => ({ value: op, label: t(`editor.condition.ops.${op}`) }))}
                  onChange={(op) => update(i, { op: op as RuleOp, right: op === 'exists' ? null : rule.right })}
                />
                {rule.op !== 'exists' && (
                  <OperandInput id={`${id}-value-${i}`} type={typeOf(rule.left)} value={rule.right} onChange={(right) => update(i, { right })} />
                )}
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label={t('editor.condition.removeRule')}
                  onClick={() => emit({ ...draft, rules: draft.rules.filter((_, j) => j !== i) })}
                >
                  <X size={12} />
                </button>
              </div>
              {incomplete && <p className={styles.stale}>{t('editor.condition.incomplete')}</p>}
            </div>
          </Fragment>
        );
      })}
      <button type="button" className={styles.linkBtn} onClick={() => emit({ ...draft, rules: [...draft.rules, { left: '', op: 'eq', right: '' }] })}>
        {t('editor.condition.addRule')}
      </button>
    </div>
  );
}

function OperandInput({ id, type, value, onChange }: { id: string; type?: BlueprintFieldType; value: Operand; onChange(v: Operand): void }) {
  const t = useTranslations('platformAdmin.blueprints');
  if (type === 'boolean') {
    return (
      <ChoiceSelect
        id={id}
        value={typeof value === 'boolean' ? String(value) : ''}
        options={[{ value: 'true', label: t('editor.condition.true') }, { value: 'false', label: t('editor.condition.false') }]}
        onChange={(v) => onChange(v === 'true')}
      />
    );
  }
  // "now" is the evaluation instant in core.condition; shown as the "agora" chip.
  if (value === 'now') {
    return <button type="button" className={styles.nowChip} onClick={() => onChange('')}>{t('editor.condition.now')} ×</button>;
  }
  return (
    <div className={styles.operand}>
      <Input
        id={id}
        aria-label={t('editor.condition.value')}
        value={value === null ? '' : String(value)}
        onChange={(e) => {
          const v = e.target.value;
          onChange(type === 'number' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : v);
        }}
      />
      {type === 'datetime' && (
        <button type="button" className={styles.linkBtn} onClick={() => onChange('now')}>{t('editor.condition.now')}</button>
      )}
    </div>
  );
}

function RawCondition({ id, value, onChange }: Pick<Props, 'id' | 'value' | 'onChange'>) {
  const t = useTranslations('platformAdmin.blueprints');
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [invalid, setInvalid] = useState(false);
  return (
    <div className={styles.field}>
      <p className={styles.help}>{t('editor.condition.raw')}</p>
      <textarea
        id={id}
        className={`${styles.textarea} ${styles.mono}`}
        rows={6}
        value={text}
        onChange={(e) => { setText(e.target.value); setInvalid(false); }}
        onBlur={() => {
          try {
            onChange(JSON.parse(text));
            setInvalid(false);
          } catch {
            // Keep the draft; the stored expression stays what the analyzer last saw.
            setInvalid(true);
          }
        }}
      />
      {invalid && <p className={styles.stale}>{t('detail.invalidJson')}</p>}
    </div>
  );
}
