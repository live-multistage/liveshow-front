'use client';

import styles from './ReactionsTicker.module.scss';

interface Props {
  totalReactions: number;
}

// Duplicated on purpose — every other file in this codebase that formats a
// compact count (LivePlayer.tsx, LiveNoAccess.tsx, AnalyticsDashboard.tsx)
// keeps its own copy rather than importing a shared util.
function fmtCompact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}k`;
  return v.toLocaleString('pt-BR');
}

export function ReactionsTicker({ totalReactions }: Props) {
  if (totalReactions === 0) return null;

  return (
    <div className={styles.ticker}>
      <span>💜</span>
      <span>🔥</span>
      <span>🤘</span>
      <span className={styles.count}>
        <strong>{fmtCompact(totalReactions)}</strong> reações
      </span>
    </div>
  );
}
