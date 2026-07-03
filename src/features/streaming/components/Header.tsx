'use client';

import { ChevronLeft, Users, Video, MessageSquare, Share2 } from 'lucide-react';
import type { LiveStage } from '../types/live.types';
import styles from './Header.module.scss';

interface Props {
  eventTitle?: string;
  metaLine: string;
  stages: LiveStage[];
  activeStageId: string;
  onStageChange: (stageId: string) => void;
  onExit: () => void;
  currentViewers: number;
  cameraCount: number;
  cameraStripOpen: boolean;
  onToggleCameraStrip: () => void;
  chatOpen: boolean;
  onToggleChat: () => void;
  chatMessageCount: number;
  onShare: () => void;
}

// Duplicated on purpose, see ReactionsTicker.tsx for why — this codebase
// keeps a local copy of this formatter in every file that needs it.
function fmtCompact(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.', ',')}k`;
  return v.toLocaleString('pt-BR');
}

export function Header({
  eventTitle,
  metaLine,
  stages,
  activeStageId,
  onStageChange,
  onExit,
  currentViewers,
  cameraCount,
  cameraStripOpen,
  onToggleCameraStrip,
  chatOpen,
  onToggleChat,
  chatMessageCount,
  onShare,
}: Props) {
  return (
    <header className={styles.header}>
      <button onClick={onExit} className={styles.backBtn} aria-label="Voltar">
        <ChevronLeft size={16} />
      </button>

      <div className={styles.titleGroup}>
        <span className={styles.liveBadge}>
          <span className={styles.liveDot} />
          AO VIVO
        </span>
        <div>
          {eventTitle && <div className={styles.title}>{eventTitle}</div>}
          <div className={styles.meta}>{metaLine}</div>
        </div>
      </div>

      {stages.length > 1 && (
        <div className={styles.tabs} role="tablist" aria-label="Palcos">
          <span className={styles.tabsLabel}>PALCOS</span>
          {stages.map((stage) => (
            <button
              key={stage.stageId}
              role="tab"
              aria-selected={stage.stageId === activeStageId}
              className={`${styles.tab} ${stage.stageId === activeStageId ? styles.tabActive : ''}`}
              onClick={() => onStageChange(stage.stageId)}
            >
              <span className={styles.tabDot} />
              {stage.name}
              <span className={styles.tabCount}>{stage.cameras.length}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.right}>
        {currentViewers > 0 && (
          <div className={styles.viewerBadge}>
            <Users size={12} />
            {fmtCompact(currentViewers)}
          </div>
        )}
        <button
          className={`${styles.drawerBtn} ${cameraStripOpen ? styles.drawerBtnActive : ''}`}
          onClick={onToggleCameraStrip}
          title="Alternar câmeras"
        >
          <Video size={13} />
          Câmeras
          <span className={styles.badge}>{cameraCount}</span>
        </button>
        <button
          className={`${styles.drawerBtn} ${chatOpen ? styles.drawerBtnActive : ''}`}
          onClick={onToggleChat}
          title="Alternar chat"
        >
          <MessageSquare size={13} />
          Chat
          <span className={styles.badge}>{chatMessageCount}</span>
        </button>
        <button className={styles.iconBtn} onClick={onShare} title="Compartilhar" aria-label="Compartilhar">
          <Share2 size={14} />
        </button>
      </div>
    </header>
  );
}
