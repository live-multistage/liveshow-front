'use client';

import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type DragEvent } from 'react';
import {
  Background, BackgroundVariant, Controls, MarkerType, MiniMap, ReactFlow, useReactFlow,
  type Connection, type Edge, type EdgeChange, type NodeChange,
} from '@xyflow/react';
import { useLocale, useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';
import type { BlueprintCatalogEntry, BlueprintEdge } from '@live-show/api-contracts';
import { cn } from '@live-show/design-system';
import { BlueprintNodeCard, type CardNode } from './BlueprintNodeCard';
import { KIND_COLOR, UNKNOWN_COLOR } from './nodeVisuals';
import { PALETTE_DND_TYPE } from './Palette';
import { parseRef, parseWait } from './expr-builders';
import { useWaitSummary } from './fields/WaitUntilBuilder';
import { catalogKey, type EditorAction, type EditorState, type Port } from './useEditorGraph';
import styles from './Canvas.module.scss';

const nodeTypes = { blueprint: BlueprintNodeCard };
const GRID = 22;
const CARD_CENTER = { x: 100, y: 36 };
const edgeId = (e: BlueprintEdge) => `${e.from}>${e.to}>${e.port ?? ''}`;

interface Props {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  catalog: Map<string, BlueprintCatalogEntry>;
  errorCounts: Map<string, number>;
  readOnly: boolean;
  /** A new object re-centers the canvas on that node (PROBLEMAS footer, ?node=). */
  focus: { id: string; seq: number } | null;
  /** Guided tour (design §A): pulses the card of the step's target node. */
  highlightNodeId?: string;
  /** Guided tour: the panel is anchored bottom-right, so move the minimap out of its way while it's visible. */
  minimapPosition?: 'bottom-left' | 'bottom-right';
}

// React Flow is driven from the editor reducer: every change is dispatched
// and the nodes/edges are re-derived. Only measured sizes stay local, because
// React Flow keeps a node hidden until its user object carries `measured`.
export function Canvas({ state, dispatch, catalog, errorCounts, readOnly, focus, highlightNodeId, minimapPosition = 'bottom-right' }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const locale = useLocale();
  const { screenToFlowPosition, setCenter } = useReactFlow();
  const summarizeWait = useWaitSummary();
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number }>>({});
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const initialFocus = useRef(focus);

  const nodes = useMemo<CardNode[]>(() => {
    const waitSub = (at: unknown) => {
      const wait = parseWait(at);
      const ref = wait && parseRef(wait.ref);
      if (!wait || !ref) return undefined;
      const source = state.nodes.find((n) => n.id === ref.nodeId);
      const out = source && catalog.get(catalogKey(source.node, source.version))?.outputs[ref.field];
      return summarizeWait(wait, out ? out.description.toLowerCase() : ref.field);
    };
    // forEach/switch (A1–A6): the sub-line shows the picked ref's bare
    // "node.field" (parseRef strips the {{ }}), joined with any nested path.
    const refSub = (value: unknown) => {
      const ref = parseRef(value);
      return ref ? [ref.nodeId, ref.field, ...ref.path].join('.') : undefined;
    };
    return state.nodes.map((n) => {
      const forEachItems = n.node === 'core.forEach' ? refSub(n.config.items) : undefined;
      return {
        id: n.id,
        type: 'blueprint' as const,
        position: n.position,
        selected: n.id === state.selectedId,
        measured: measured[n.id],
        data: {
          instance: n,
          entry: catalog.get(catalogKey(n.node, n.version)),
          errorCount: errorCounts.get(n.id) ?? 0,
          sub: n.node === 'core.waitUntil'
            ? waitSub(n.config.at)
            : n.node === 'core.delay' && typeof n.config.duration === 'string' ? n.config.duration
              : n.node === 'core.forEach' ? (forEachItems ?? t('editor.fields.selectList'))
                : n.node === 'core.switch' ? refSub(n.config.value)
                  : undefined,
          subMuted: n.node === 'core.forEach' && !forEachItems,
          errorConnected: state.edges.some((e) => e.from === n.id && e.port === 'error'),
          tourHighlight: n.id === highlightNodeId,
        },
      };
    });
  }, [state.nodes, state.selectedId, measured, catalog, errorCounts, summarizeWait, state.edges, t, highlightNodeId]);

  // "next" edges (the single-output "then" wire of a call action) carry no
  // label per design; true/false/error do, falling back to the raw port name
  // if a locale is missing the key.
  const edges = useMemo<Edge[]>(() => state.edges.map((e) => {
    const id = edgeId(e);
    const label = e.port && e.port !== 'next'
      ? (t.has(`editor.ports.${e.port}`) ? t(`editor.ports.${e.port}`) : e.port)
      : undefined;
    return {
      id,
      source: e.from,
      target: e.to,
      sourceHandle: e.port ?? null,
      selected: id === selectedEdge,
      label,
      className: cn(e.port === 'true' && styles.edgeTrue, e.port === 'false' && styles.edgeFalse, e.port === 'error' && styles.edgeError),
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: 'rgba(255,255,255,.4)' },
    };
  }), [state.edges, selectedEdge, t]);

  const onNodesChange = useCallback((changes: NodeChange<CardNode>[]) => {
    for (const c of changes) {
      if (c.type === 'dimensions' && c.dimensions) {
        const d = c.dimensions;
        setMeasured((m) => (m[c.id]?.width === d.width && m[c.id]?.height === d.height ? m : { ...m, [c.id]: d }));
      } else if (c.type === 'position' && c.position && !readOnly) {
        dispatch({ type: 'move', id: c.id, position: c.position });
      } else if (c.type === 'select' && c.selected) {
        setSelectedEdge(null);
        dispatch({ type: 'select', id: c.id });
      } else if (c.type === 'remove' && !readOnly) {
        dispatch({ type: 'remove', id: c.id });
      }
    }
  }, [dispatch, readOnly]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const c of changes) {
      if (c.type === 'select') setSelectedEdge((cur) => (c.selected ? c.id : cur === c.id ? null : cur));
      else if (c.type === 'remove' && !readOnly) {
        const edge = state.edges.find((e) => edgeId(e) === c.id);
        if (edge) dispatch({ type: 'disconnect', edge });
      }
    }
  }, [dispatch, readOnly, state.edges]);

  const onConnect = useCallback((c: Connection) => {
    dispatch({ type: 'connect', from: c.source, to: c.target, port: (c.sourceHandle as Port | null) ?? undefined });
  }, [dispatch]);

  const centerOn = useCallback((id: string) => {
    const n = state.nodes.find((x) => x.id === id);
    if (n) void setCenter(n.position.x + CARD_CENTER.x, n.position.y + CARD_CENTER.y, { zoom: 1, duration: 300 });
  }, [state.nodes, setCenter]);

  // Later focus requests only; the one present at mount is applied in onInit,
  // once the viewport has its size.
  useEffect(() => {
    if (focus && focus !== initialFocus.current) centerOn(focus.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  function onDragOver(e: DragEvent) {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function onDrop(e: DragEvent) {
    const entry = catalog.get(e.dataTransfer.getData(PALETTE_DND_TYPE));
    if (readOnly || !entry) return;
    e.preventDefault();
    dispatch({ type: 'add', entry, position: screenToFlowPosition({ x: e.clientX, y: e.clientY }) });
  }

  const triggers = new Intl.ListFormat(locale, { type: 'disjunction' })
    .format([...catalog.values()].filter((e) => e.kind === 'trigger').map((e) => e.label));

  return (
    <div className={styles.canvas} onDragOver={onDragOver} onDrop={onDrop}>
      <div className={styles.toggles}>
        <button type="button" aria-pressed={grid} className={cn(styles.toggle, grid && styles.toggleOn)} onClick={() => setGrid((g) => !g)}>
          {t('editor.canvas.grid')}
        </button>
        <button type="button" aria-pressed={snap} className={cn(styles.toggle, snap && styles.toggleOn)} onClick={() => setSnap((s) => !s)}>
          {t('editor.canvas.snap')}
        </button>
      </div>
      <ReactFlow<CardNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={() => { setSelectedEdge(null); dispatch({ type: 'select', id: null }); }}
        onInit={() => { if (initialFocus.current) centerOn(initialFocus.current.id); }}
        isValidConnection={(c) => c.source !== c.target}
        fitView={!initialFocus.current}
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={1.5}
        snapToGrid={snap}
        snapGrid={[GRID, GRID]}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        {grid && <Background variant={BackgroundVariant.Dots} gap={GRID} size={1} color="rgba(255,255,255,.07)" />}
        <Controls position="bottom-left" showInteractive={false} className={styles.controls} />
        <MiniMap<CardNode>
          position={minimapPosition}
          pannable
          zoomable
          className={styles.minimap}
          maskColor="rgba(8,8,10,.6)"
          nodeColor={(n) => (n.data.entry ? KIND_COLOR[n.data.entry.kind] : UNKNOWN_COLOR)}
        />
      </ReactFlow>
      {state.nodes.length === 0 && (
        <div className={styles.emptyWrap}>
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><Zap size={24} aria-hidden /></div>
            <p className={styles.emptyTitle}>{t('editor.canvas.emptyTitle')}</p>
            <p className={styles.emptyBody}>{t('editor.canvas.emptyBody', { triggers })}</p>
          </div>
        </div>
      )}
    </div>
  );
}
