'use client';

import { useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { PATH_NODE, type PathMatch, type PathsReport } from '@live-show/api-contracts';
import { layoutSankey } from '../../utils/sankey-layout';
import { isSyntheticNode, pathNodeLabel } from '../../utils/path-node';
import styles from './SankeyChart.module.scss';

const SIZE = { width: 880, height: 420, nodeWidth: 12, nodeGap: 14 };
const PAD_X = 150;
const PAD_TOP = 28;
const MIN_NODE_HEIGHT = 3;
const MAX_LABEL = 22;

type Focus = { kind: 'node'; id: string } | { kind: 'link'; id: string };

const nodeId = (offset: number, key: string) => `${offset}|${key}`;
const linkId = (fromOffset: number, from: string, to: string) => `${fromOffset}|${from}|${to}`;

function focusOf(match: PathMatch[] | null): Focus | null {
  if (!match) return null;
  if (match.length === 1) return { kind: 'node', id: nodeId(match[0].offset, match[0].node) };
  return { kind: 'link', id: linkId(match[0].offset, match[0].node, match[1].node) };
}

const truncate = (s: string) => (s.length > MAX_LABEL ? `${s.slice(0, MAX_LABEL - 1)}…` : s);

function onActivate(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    handler();
  };
}

interface Props {
  report: PathsReport;
  selected?: PathMatch[] | null;
  onSelect: (match: PathMatch[]) => void;
}

export function SankeyChart({ report, selected = null, onSelect }: Props) {
  const t = useTranslations('platformAdmin.tracking');
  const format = useFormatter();
  const [hover, setHover] = useState<Focus | null>(null);
  const layout = useMemo(() => layoutSankey(report, SIZE), [report]);

  const label = (key: string) => pathNodeLabel(key, t as (k: string) => string);
  const columnTotal = (offset: number) =>
    report.columns.find((c) => c.offset === offset)?.nodes.reduce((sum, n) => sum + n.sessions, 0) || 1;
  const lastX = Math.max(...layout.nodes.map((n) => n.x));
  const headers = report.columns.flatMap((c) => {
    const x = layout.nodes.find((n) => n.offset === c.offset)?.x;
    return x === undefined ? [] : [{ offset: c.offset, x, atEnd: x === lastX }];
  });

  const focus = hover ?? focusOf(selected);
  const linkActive = (id: string, from: string, fromOffset: number, to: string) => {
    if (!focus) return null;
    if (focus.kind === 'link') return focus.id === id;
    return focus.id === nodeId(fromOffset, from) || focus.id === nodeId(fromOffset + 1, to);
  };
  const activeNodes = new Set<string>();
  if (focus?.kind === 'node') activeNodes.add(focus.id);
  layout.links.forEach((l) => {
    if (linkActive(linkId(l.fromOffset, l.from, l.to), l.from, l.fromOffset, l.to)) {
      activeNodes.add(nodeId(l.fromOffset, l.from));
      activeNodes.add(nodeId(l.fromOffset + 1, l.to));
    }
  });

  const tooltip = hover ? buildTooltip() : null;
  function buildTooltip() {
    if (!hover) return null;
    if (hover.kind === 'node') {
      const n = layout.nodes.find((q) => nodeId(q.offset, q.key) === hover.id);
      if (!n) return null;
      return { x: n.x + SIZE.nodeWidth / 2, y: n.y, title: label(n.key), sessions: n.sessions, total: columnTotal(n.offset) };
    }
    const l = layout.links.find((q) => linkId(q.fromOffset, q.from, q.to) === hover.id);
    if (!l) return null;
    const source = layout.nodes.find((q) => q.offset === l.fromOffset && q.key === l.from);
    const target = layout.nodes.find((q) => q.offset === l.fromOffset + 1 && q.key === l.to);
    if (!source || !target) return null;
    return {
      x: (source.x + target.x + SIZE.nodeWidth) / 2,
      y: Math.min(source.y, target.y),
      title: `${label(l.from)} → ${label(l.to)}`,
      sessions: l.sessions,
      total: columnTotal(l.fromOffset),
    };
  }

  const columnHead = (offset: number) =>
    offset === 0 ? t('reports.paths.anchorColumn') : offset > 0 ? `+${offset}` : `−${-offset}`;

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${SIZE.width + PAD_X * 2} ${SIZE.height + PAD_TOP + 20}`}
      onMouseLeave={() => setHover(null)}
    >
      <g transform={`translate(${PAD_X} ${PAD_TOP})`}>
        {headers.map((c) => (
          <text
            key={c.offset}
            x={c.x + (c.atEnd ? SIZE.nodeWidth : 0)}
            y={-10}
            textAnchor={c.atEnd ? 'end' : 'start'}
            className={c.offset === 0 ? styles.headAnchor : styles.head}
          >
            {columnHead(c.offset)}
          </text>
        ))}

        {layout.links.map((l) => {
          const id = linkId(l.fromOffset, l.from, l.to);
          const active = linkActive(id, l.from, l.fromOffset, l.to);
          const neutral = isSyntheticNode(l.from) || isSyntheticNode(l.to);
          const clickable = l.from !== PATH_NODE.other && l.to !== PATH_NODE.other;
          const select = () => onSelect([{ offset: l.fromOffset, node: l.from }, { offset: l.fromOffset + 1, node: l.to }]);
          const classes = [
            styles.link,
            neutral ? styles.neutral : '',
            active === true ? styles.active : '',
            active === false ? styles.dim : '',
            clickable ? styles.clickable : '',
          ].join(' ');
          return (
            <path
              key={id}
              d={l.path}
              fill="none"
              strokeWidth={l.thickness}
              className={classes}
              onMouseEnter={() => setHover({ kind: 'link', id })}
              {...(clickable && {
                role: 'button',
                tabIndex: 0,
                'aria-label': `${label(l.from)} → ${label(l.to)} ${l.sessions}`,
                onFocus: () => setHover({ kind: 'link', id }),
                onBlur: () => setHover(null),
                onClick: select,
                onKeyDown: onActivate(select),
              })}
            />
          );
        })}

        {layout.nodes.map((n) => {
          const id = nodeId(n.offset, n.key);
          const dim = focus !== null && !activeNodes.has(id);
          const clickable = n.key !== PATH_NODE.other;
          const anchor = n.offset === 0;
          const atEnd = n.x === lastX && n.x > 0;
          const height = Math.max(MIN_NODE_HEIGHT, n.height);
          const select = () => onSelect([{ offset: n.offset, node: n.key }]);
          const text = label(n.key);
          return (
            <g
              key={id}
              className={`${styles.node} ${dim ? styles.dim : ''} ${clickable ? styles.clickable : ''}`}
              onMouseEnter={() => setHover({ kind: 'node', id })}
              {...(clickable && {
                role: 'button',
                tabIndex: 0,
                'aria-label': `${text} ${n.sessions}`,
                onFocus: () => setHover({ kind: 'node', id }),
                onBlur: () => setHover(null),
                onClick: select,
                onKeyDown: onActivate(select),
              })}
            >
              <title>{text}</title>
              {anchor && (
                <rect className={styles.ring} x={n.x - 4} y={n.y - 4} width={n.width + 8} height={height + 8} rx={6} />
              )}
              <rect
                className={anchor ? styles.nodeAnchor : isSyntheticNode(n.key) ? styles.nodeSynthetic : styles.nodeBar}
                x={n.x}
                y={n.y}
                width={n.width}
                height={height}
                rx={3}
              />
              <text
                className={`${styles.nodeLabel} ${isSyntheticNode(n.key) ? styles.syntheticLabel : ''}`}
                x={atEnd ? n.x - 8 : n.x + n.width + 8}
                y={n.y + height / 2}
                textAnchor={atEnd ? 'end' : 'start'}
                dominantBaseline="middle"
              >
                {truncate(text)} <tspan className={styles.count}>{format.number(n.sessions)}</tspan>
              </text>
            </g>
          );
        })}

        {tooltip && (
          <g className={styles.tooltip} transform={`translate(${tooltip.x} ${Math.max(tooltip.y, 60) - 10})`}>
            <rect x={-110} y={-52} width={220} height={52} rx={8} />
            <text x={0} y={-32} textAnchor="middle" className={styles.tipTitle}>{truncate(tooltip.title)}</text>
            <text x={0} y={-12} textAnchor="middle" className={styles.tipBody}>
              {t('reports.paths.sessions', { count: tooltip.sessions })} ·{' '}
              {t('reports.paths.columnShare', {
                percent: format.number(tooltip.sessions / tooltip.total, { style: 'percent', maximumFractionDigits: 1 }),
              })}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}
