'use client';

import { useState, type Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Copy, Trash2 } from 'lucide-react';
import type { BlueprintAnalysisError, BlueprintCatalogEntry } from '@live-show/api-contracts';
import { Button, Input, cn } from '@live-show/design-system';
import { blueprintErrorMessage } from '../errorMessage';
import { ConfigField } from './fields/ConfigField';
import { NodeIcon, kindClass } from './nodeVisuals';
import { availableFields, catalogKey, type EditorAction, type EditorState } from './useEditorGraph';
import styles from './Inspector.module.scss';

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
            <h4 className={styles.sectionTitle}>{t('editor.inspector.outputs')}</h4>
            <ul className={styles.outputs}>
              {entry.ports.map((p) => {
                const edge = state.edges.find((e) => e.from === node.id && e.port === p);
                return (
                  <li key={p}>
                    <span className={cn(styles.dot, p === 'true' ? styles.dotTrue : styles.dotFalse)} />
                    {t(`editor.ports.${p}`)} → {edge ? labelOf(edge.to) : t('editor.inspector.noTarget')}
                  </li>
                );
              })}
            </ul>
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
