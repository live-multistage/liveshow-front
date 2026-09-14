'use client';

import { Fragment, memo, type CSSProperties } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useTranslations } from 'next-intl';
import type { BlueprintCatalogEntry } from '@live-show/api-contracts';
import { cn } from '@live-show/design-system';
import { NodeIcon, kindClass } from './nodeVisuals';
import { portsOfNode, type EditorNode } from './useEditorGraph';
import styles from './Canvas.module.scss';

// Ports whose translated label reads grey rather than in the node's kind color
// (design A1–A6): the "afterwards" branch of forEach and the fallthrough case
// of switch, both de-emphasized next to the highlighted "each"/case ports.
const MUTED_PORTS = new Set(['done', 'default']);

export interface CardData extends Record<string, unknown> {
  instance: EditorNode;
  entry?: BlueprintCatalogEntry;
  errorCount: number;
  sub?: string;
  /** Renders `sub` grey instead of the kind color (A3: forEach with no list picked yet). */
  subMuted?: boolean;
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
  const { instance, entry, errorCount, sub, subMuted, errorConnected } = data;
  const ports = entry ? portsOfNode(entry, instance.config) : null;
  // `ports === null` means the catalog gave no static/dynamic list (an unknown
  // node, or one that only ever has a single unnamed "next" handle); every
  // other node (incl. core.end's `[]`) stacks its named right-side ports.
  const rightPorts: { name?: string }[] = ports ? ports.filter((p) => p.name !== 'error') : [{}];
  const hasErrorPort = ports?.some((p) => p.name === 'error') ?? false;
  const portLabel = (name: string) => (t.has(`editor.ports.${name}`) ? t(`editor.ports.${name}`) : name);

  return (
    <div
      className={cn(
        styles.card,
        kindClass(entry?.kind),
        selected && styles.selected,
        errorCount > 0 && styles.hasError,
        !entry && styles.unknown,
        rightPorts.length > 2 && styles.stacked,
      )}
      style={{ '--card-ports': rightPorts.length } as CSSProperties}
    >
      {entry && <span className={styles.stripe} />}
      <span className={styles.icon}><NodeIcon nodeKey={instance.node} kind={entry?.kind} /></span>
      <span className={styles.text}>
        <span className={styles.name}>{entry?.label ?? t('editor.unavailable')}</span>
        <span className={styles.key}>{instance.node}</span>
        {sub && <span className={cn(styles.sub, subMuted && styles.subMuted)}>{sub}</span>}
      </span>
      <span className={styles.nodeId}>{instance.id}</span>
      {errorCount > 0 && <span className={styles.errorBadge}>{errorCount}</span>}
      {entry?.kind !== 'trigger' && <Handle type="target" position={Position.Left} className={styles.port} />}
      {rightPorts.map((p, i) => {
        const portStyle = { '--port-index': i } as CSSProperties;
        return (
          <Fragment key={p.name ?? '_next'}>
            <Handle id={p.name} type="source" position={Position.Right} className={cn(styles.port, styles.portRight)} style={portStyle} />
            {p.name && (
              <span className={cn(styles.portLabel, MUTED_PORTS.has(p.name) && styles.portLabelMuted)} style={portStyle}>
                {portLabel(p.name)}
              </span>
            )}
          </Fragment>
        );
      })}
      {hasErrorPort && (
        <Handle
          id="error"
          type="source"
          position={Position.Bottom}
          className={cn(styles.port, styles.portError, errorConnected && styles.portErrorConnected)}
        />
      )}
      {hasErrorPort && <span className={styles.errorLabel}>{t('editor.ports.error')}</span>}
    </div>
  );
}

export const BlueprintNodeCard = memo(BlueprintNodeCardImpl);
