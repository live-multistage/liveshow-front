'use client';

import { ChevronLeft, Users, Video, MessageSquare, Share2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { ReportButton } from '@/features/reports';
import type { LiveStage } from '../types/live.types';
import styles from './Header.module.scss';

interface Props {
  className?: string;
  // Set by LivePlayer to `right: DRAWER_W` while the camera drawer is open,
  // constraining the header bar's own box so it stops before the drawer's
  // strip instead of just padding its (still full-width) contents — a
  // padding-only fix left the bar's transparent right edge sitting over the
  // drawer's close/mode buttons and swallowing their clicks (see
  // CameraGrid's DRAWER_W — the single source for that width).
  style?: CSSProperties;
  eventId: string;
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
  chatEnabled: boolean;
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
  className,
  style,
  eventId,
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
  chatEnabled,
  chatOpen,
  onToggleChat,
  chatMessageCount,
  onShare,
}: Props) {
  const t = useTranslations('player');
  return (
    <header className={`${styles.header} ${className ?? ''}`} style={style}>
      <button onClick={onExit} className={styles.backBtn} aria-label={t('back')}>
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
        <div className={styles.tabs} role="tablist" aria-label={t('stages')}>
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
          title={t('toggleCameras')}
        >
          <Video size={13} />
          {t('cameras')}
          <span className={styles.badge}>{cameraCount}</span>
        </button>
        {chatEnabled && (
          <button
            className={`${styles.drawerBtn} ${chatOpen ? styles.drawerBtnActive : ''}`}
            onClick={onToggleChat}
            title={t('toggleChat')}
          >
            <MessageSquare size={13} />
            Chat
            <span className={styles.badge}>{chatMessageCount}</span>
          </button>
        )}
        <button className={styles.iconBtn} onClick={onShare} title={t('share')} aria-label={t('share')}>
          <Share2 size={14} />
        </button>
        <ReportButton eventId={eventId} className={styles.iconBtn} iconOnly />
      </div>
    </header>
  );
}
