'use client';

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useTranslations } from 'next-intl';
import type { BlueprintCatalogEntry } from '@live-show/api-contracts';
import { cn } from '@live-show/design-system';
import { NodeIcon, kindClass } from './nodeVisuals';
import { portsOfNode, type EditorNode } from './useEditorGraph';
import styles from './Canvas.module.scss';

export interface CardData extends Record<string, unknown> {
  instance: EditorNode;
  entry?: BlueprintCatalogEntry;
  errorCount: number;
  sub?: string;
  /** Whether an edge already leaves this node's `error` port (D1: dashed ring at 100% opacity once wired). */
  errorConnected?: boolean;
}
export type CardNode = Node<CardData, 'blueprint'>;

// ~200×72 card: kind stripe + icon, label, technical key, node id; a trigger
// has no input, the end node no output, a condition one output per port. A
// call action (http.request) carries a `next` port plus an optional `error`
// port pinned to the bottom edge (dashed ring, "erro" caption). A node
// missing from the catalog renders as the grey dashed "Nó indisponível".
function BlueprintNodeCardImpl({ data, selected }: NodeProps<CardNode>) {
  const t = useTranslations('platformAdmin.blueprints');
  const { instance, entry, errorCount, sub, errorConnected } = data;
  const ports = entry ? portsOfNode(entry, instance.config) : null;

  return (
    <div className={cn(styles.card, kindClass(entry?.kind), selected && styles.selected, errorCount > 0 && styles.hasError, !entry && styles.unknown)}>
      {entry && <span className={styles.stripe} />}
      <span className={styles.icon}><NodeIcon nodeKey={instance.node} kind={entry?.kind} /></span>
      <span className={styles.text}>
        <span className={styles.name}>{entry?.label ?? t('editor.unavailable')}</span>
        <span className={styles.key}>{instance.node}</span>
        {sub && <span className={styles.sub}>{sub}</span>}
      </span>
      <span className={styles.nodeId}>{instance.id}</span>
      {errorCount > 0 && <span className={styles.errorBadge}>{errorCount}</span>}
      {entry?.kind !== 'trigger' && <Handle type="target" position={Position.Left} className={styles.port} />}
      {ports
        ? ports.map(({ name }) => (
          name === 'error'
            ? (
              <Handle
                key={name}
                id={name}
                type="source"
                position={Position.Bottom}
                className={cn(styles.port, styles.portError, errorConnected && styles.portErrorConnected)}
              />
            )
            : (
              <Handle
                key={name}
                id={name}
                type="source"
                position={Position.Right}
                className={cn(styles.port, name === 'true' ? styles.portTrue : name === 'false' ? styles.portFalse : undefined)}
              />
            )
        ))
        : entry?.key !== 'core.end' && <Handle type="source" position={Position.Right} className={styles.port} />}
      {ports?.some((p) => p.name === 'error') && <span className={styles.errorLabel}>{t('editor.ports.error')}</span>}
    </div>
  );
}

export const BlueprintNodeCard = memo(BlueprintNodeCardImpl);
