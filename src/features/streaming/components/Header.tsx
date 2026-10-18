'use client';

import { ChevronLeft, Users, Video, MessageSquare, Share2, List } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { ReportButton } from '@/features/reports';
import type { LiveStage, LockedStreamOffer } from '../types/live.types';
import { TransmissionSelector } from './TransmissionSelector';
import type { SelectorStream } from './TransmissionSelector';
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
  // AO VIVO (lit dot) for live/channel, static REPLAY chip for replay.
  badge: 'live' | 'replay';
  eventId: string;
  eventTitle?: string;
  metaLine: string;
  stages: LiveStage[];
  activeStageId: string;
  onStageChange: (stageId: string) => void;
  onExit: () => void;
  // Live-only: hidden when undefined (replay) or 0.
  currentViewers?: number;
  cameraCount: number;
  cameraStripOpen: boolean;
  onToggleCameraStrip: () => void;
  chatEnabled: boolean;
  chatOpen?: boolean;
  onToggleChat?: () => void;
  chatMessageCount?: number;
  // Replay with at least one visible chapter.
  chapters?: { open: boolean; onToggle: () => void; count: number };
  onShare: () => void;
  // Granted transmissions; the selector shows with two or more transmissions, granted or for sale.
  streams?: SelectorStream[];
  activeStreamId?: string | null;
  onStreamChange?: (streamId: string) => void;
  // Owned by the player shell so the selector and the side drawers exclude each other.
  transmissionsOpen?: boolean;
  onTransmissionsOpenChange?: (open: boolean) => void;
  // Transmissions the viewer can buy, listed after the granted ones.
  lockedStreams?: LockedStreamOffer[];
  onUnlockStream?: (locked: LockedStreamOffer) => void;
  unlockPending?: boolean;
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
  badge,
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
  chatOpen = false,
  onToggleChat,
  chatMessageCount = 0,
  chapters,
  onShare,
  streams = [],
  activeStreamId = null,
  onStreamChange,
  transmissionsOpen,
  onTransmissionsOpenChange,
  lockedStreams = [],
  onUnlockStream,
  unlockPending = false,
}: Props) {
  const t = useTranslations('player');
  const multiStream = streams.length > 0 && streams.length + lockedStreams.length >= 2 && !!onStreamChange;
  const activeStreamTitle = multiStream ? (streams.find((s) => s.id === activeStreamId) ?? streams[0]).title : null;
  return (
    <header className={`${styles.header} ${className ?? ''}`} style={style}>
      <button onClick={onExit} className={styles.backBtn} aria-label={t('back')}>
        <ChevronLeft size={16} />
      </button>

      <div className={styles.titleGroup}>
        {badge === 'live' ? (
          <span className={styles.liveBadge}>
            <span className={styles.liveDot} />
            AO VIVO
          </span>
        ) : (
          <span className={styles.replayBadge}>REPLAY</span>
        )}
        <div>
          {eventTitle && <div className={styles.title}>{eventTitle}</div>}
          <div className={styles.meta}>
            {activeStreamTitle && (
              <>
                <span className={styles.metaStream}>{activeStreamTitle}</span>
                {metaLine && ' · '}
              </>
            )}
            {metaLine}
          </div>
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
        {currentViewers != null && currentViewers > 0 && (
          <div className={styles.viewerBadge}>
            <Users size={12} />
            {fmtCompact(currentViewers)}
          </div>
        )}
        {chapters && (
          <button
            className={`${styles.drawerBtn} ${styles.chaptersBtn} ${chapters.open ? styles.drawerBtnActive : ''}`}
            onClick={chapters.onToggle}
            aria-label={t('chapters.open')}
            aria-expanded={chapters.open}
          >
            <List size={13} />
            <span className={styles.drawerBtnLabel}>{t('chapters.label')}</span>
            <span className={`${styles.badge} ${styles.drawerBtnLabel}`}>{chapters.count}</span>
          </button>
        )}
        {multiStream && onStreamChange && (
          <TransmissionSelector
            streams={streams}
            activeStreamId={activeStreamId}
            onStreamChange={onStreamChange}
            open={transmissionsOpen}
            onOpenChange={onTransmissionsOpenChange}
            lockedStreams={lockedStreams}
            onUnlockStream={onUnlockStream}
            unlockPending={unlockPending}
            replay={badge === 'replay'}
          />
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
