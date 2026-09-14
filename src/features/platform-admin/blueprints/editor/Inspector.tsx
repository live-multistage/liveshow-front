'use client';

import { useState, type Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, ChevronRight, Copy, Trash2 } from 'lucide-react';
import type { BlueprintAnalysisError, BlueprintCatalogEntry, BlueprintOutputField } from '@live-show/api-contracts';
import { Button, Input, cn } from '@live-show/design-system';
import { blueprintErrorMessage } from '../errorMessage';
import { ConfigField } from './fields/ConfigField';
import { ClassChip } from './fields/RefSelect';
import { isObject, typeLabel } from './field-types';
import { NodeIcon, kindClass } from './nodeVisuals';
import { availableFields, catalogKey, type EditorAction, type EditorState } from './useEditorGraph';
import styles from './Inspector.module.scss';

const PORT_DOT: Record<string, string> = { true: 'dotTrue', false: 'dotFalse', next: 'dotNext', error: 'dotError' };
const DEPTH_CLASS = [undefined, 'outputDepth1', 'outputDepth2', 'outputDepth3'] as const;

interface Props {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  catalog: Map<string, BlueprintCatalogEntry>;
  errors: BlueprintAnalysisError[];
  readOnly: boolean;
}

// Right panel (design C1/C2): header with editable id, fields generated from
// the node's config schema, condition outputs, this node's problems, and
// Duplicar / Excluir. Read-only disables every control via the fieldset.
export function Inspector({ state, dispatch, catalog, errors, readOnly }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const node = state.nodes.find((n) => n.id === state.selectedId);

  if (!node) {
    return (
      <aside className={cn(styles.panel, readOnly && styles.readOnly)} aria-label={t('editor.inspector.title')}>
        <p className={styles.empty}>{t('editor.inspector.empty')}</p>
      </aside>
    );
  }

  const entry = catalog.get(catalogKey(node.node, node.version));
  const fields = availableFields(state, catalog, node.id);
  const nodeErrors = errors.filter((e) => e.nodeId === node.id);
  const labelOf = (id: string) => {
    const target = state.nodes.find((n) => n.id === id);
    return (target && catalog.get(catalogKey(target.node, target.version))?.label) ?? id;
  };
  const errorTitle = (code: string) => blueprintErrorMessage(t, code);

  return (
    <aside className={cn(styles.panel, kindClass(entry?.kind), readOnly && styles.readOnly)} aria-label={t('editor.inspector.title')}>
      <fieldset className={styles.fieldset} disabled={readOnly}>
        <header className={styles.header}>
          <span className={styles.icon}><NodeIcon nodeKey={node.node} kind={entry?.kind} size={16} /></span>
          <div className={styles.heading}>
            <div className={styles.label}>{entry?.label ?? t('editor.unavailable')}</div>
            <div className={styles.type}>{entry ? `${t(`editor.kind.${entry.kind}`)} · ${node.node}` : node.node}</div>
          </div>
          <NodeIdInput key={node.id} id={node.id} label={t('editor.inspector.nodeId')} onRename={(newId) => dispatch({ type: 'rename', id: node.id, newId })} />
        </header>

        {entry
          ? Object.entries(entry.config).map(([name, spec]) => (
            <ConfigField
              key={`${state.loadId}:${node.id}:${name}`}
              nodeId={node.id}
              entry={entry}
              name={name}
              spec={spec}
              value={node.config[name]}
              fields={fields}
              onChange={(value) => dispatch({ type: 'setConfig', id: node.id, field: name, value })}
            />
          ))
          : <p className={styles.muted}>{t('editor.inspector.unavailableHint')}</p>}

        {entry?.ports && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>{t('editor.inspector.ports')}</h4>
            <ul className={styles.outputs}>
              {entry.ports.map((p) => {
                const edge = state.edges.find((e) => e.from === node.id && e.port === p);
                return (
                  <li key={p}>
                    <span className={cn(styles.dot, styles[PORT_DOT[p] ?? 'dotNext'])} />
                    {t(`editor.ports.${p}`)} → {edge ? labelOf(edge.to) : t('editor.inspector.noTarget')}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {entry && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>{t('editor.inspector.outputs')}</h4>
            {Object.keys(entry.outputs).length === 0
              ? <p className={styles.muted}>{t('editor.inspector.noOutputs')}</p>
              : (
                <ul className={styles.outputTree}>
                  {Object.entries(entry.outputs).filter(([, spec]) => !spec.port).map(([name, spec]) => (
                    <OutputRow key={name} name={name} spec={spec} depth={0} />
                  ))}
                  {Object.entries(entry.outputs).some(([, spec]) => spec.port) && (
                    <li className={styles.errorPortSection}>{t('editor.fields.errorPortSection')}</li>
                  )}
                  {Object.entries(entry.outputs).filter(([, spec]) => spec.port).map(([name, spec]) => (
                    <OutputRow key={name} name={name} spec={spec} depth={0} />
                  ))}
                </ul>
              )}
          </section>
        )}

        <section className={styles.section}>
          <h4 className={styles.sectionTitle}>{t('editor.inspector.problems')}</h4>
          {nodeErrors.length === 0
            ? <p className={styles.ok}><Check size={13} aria-hidden />{t('editor.inspector.noProblems')}</p>
            : (
              <ul className={styles.problems}>
                {nodeErrors.map((e, i) => (
                  <li key={i} className={styles.problem}>
                    <AlertTriangle size={14} aria-hidden />
                    <div>
                      <div className={styles.problemTitle}>{errorTitle(e.code)}</div>
                      <div className={styles.problemMessage}>{e.message}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
        </section>

        <footer className={styles.footer}>
          <Button variant="outline" size="sm" className={styles.footerBtn} onClick={() => dispatch({ type: 'duplicate', id: node.id })}>
            <Copy size={12} aria-hidden />{t('editor.inspector.duplicate')}
          </Button>
          <Button variant="outline" size="sm" className={cn(styles.footerBtn, styles.danger)} onClick={() => dispatch({ type: 'remove', id: node.id })}>
            <Trash2 size={12} aria-hidden />{t('editor.inspector.remove')}
          </Button>
        </footer>
      </fieldset>
    </aside>
  );
}

// One output leaf/branch (design C4): object fields recurse into their
// children ("partner" → "partner.name"), each indented by depth; a `json`
// output can't be referenced directly, so it carries a hint pointing at
// Transformar instead of the class chip a leaf gets.
function OutputRow({ name, spec, depth }: { name: string; spec: BlueprintOutputField; depth: number }) {
  const t = useTranslations('platformAdmin.blueprints');
  const object = isObject(spec.type);
  const depthKey = DEPTH_CLASS[Math.min(depth, 3)];
  return (
    <>
      <li className={cn(styles.outputRow, depthKey && styles[depthKey])}>
        {object && <ChevronRight size={11} className={styles.outputChevron} aria-hidden />}
        <span className={styles.mono}>{name}</span>
        <span className={cn(styles.chip, styles.typeChip)}>{spec.type === 'json' ? 'JSON' : typeLabel(spec.type)}</span>
        {!object && <ClassChip cls={spec.class} />}
        {spec.type === 'json' && <span className={styles.jsonHint}>{t('editor.inspector.jsonHint')}</span>}
      </li>
      {isObject(spec.type) && Object.entries(spec.type.object).map(([childName, childSpec]) => (
        <OutputRow key={`${name}.${childName}`} name={`${name}.${childName}`} spec={childSpec} depth={depth + 1} />
      ))}
    </>
  );
}

// Commits on blur/Enter; the reducer ignores an invalid or taken id, and the
// key={node.id} remount resets the draft either way.
function NodeIdInput({ id, label, onRename }: { id: string; label: string; onRename(newId: string): void }) {
  const [draft, setDraft] = useState(id);
  const commit = () => {
    const next = draft.trim();
    if (next && next !== id) onRename(next);
    setDraft(id);
  };
  return (
    <Input
      aria-label={label}
      className={styles.idInput}
      value={draft}
      maxLength={64}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
    />
  );
}
