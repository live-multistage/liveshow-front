'use client';

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useTranslations } from 'next-intl';
import type { BlueprintCatalogEntry } from '@live-show/api-contracts';
import { cn } from '@live-show/design-system';
import { NodeIcon, kindClass } from './nodeVisuals';
import type { EditorNode } from './useEditorGraph';
import styles from './Canvas.module.scss';

export interface CardData extends Record<string, unknown> {
  instance: EditorNode;
  entry?: BlueprintCatalogEntry;
  errorCount: number;
  sub?: string;
}
export type CardNode = Node<CardData, 'blueprint'>;

// ~200×72 card: kind stripe + icon, label, technical key, node id; a trigger
// has no input, the end node no output, a condition one output per port.
// A node missing from the catalog renders as the grey dashed "Nó indisponível".
function BlueprintNodeCardImpl({ data, selected }: NodeProps<CardNode>) {
  const t = useTranslations('platformAdmin.blueprints');
  const { instance, entry, errorCount, sub } = data;

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
      {entry?.ports
        ? entry.ports.map((p) => (
          <Handle key={p} id={p} type="source" position={Position.Right} className={cn(styles.port, p === 'true' ? styles.portTrue : styles.portFalse)} />
        ))
        : entry?.key !== 'core.end' && <Handle type="source" position={Position.Right} className={styles.port} />}
    </div>
  );
}

export const BlueprintNodeCard = memo(BlueprintNodeCardImpl);
