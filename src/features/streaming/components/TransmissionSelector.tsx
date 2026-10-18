'use client';

import { useEffect, useRef, useState } from 'react';
import type { FocusEvent } from 'react';
import { Check, ChevronDown, ChevronUp, Radio, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './TransmissionSelector.module.scss';

// Live streams carry `live`; replay streams don't and may carry their window length.
export interface SelectorStream {
  id: string;
  title: string;
  live?: boolean;
  durationMs?: number;
}

interface Props {
  streams: SelectorStream[];
  activeStreamId: string | null;
  onStreamChange: (streamId: string) => void;
  // Controlled by the player shell (exclusive with the camera/chapters drawers);
  // falls back to local state when omitted.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function formatWindow(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}

// Header pill + anchored popover (bottom sheet ≤820px) to switch transmission.
// Not the design-system DropdownMenu: that portals to <body>, which is
// invisible while the player container is the fullscreen element.
export function TransmissionSelector({ streams, activeStreamId, onStreamChange, open: openProp, onOpenChange }: Props) {
  const t = useTranslations('player');
  const [localOpen, setLocalOpen] = useState(false);
  const open = openProp ?? localOpen;
  const setOpen = (next: boolean) => {
    setLocalOpen(next);
    onOpenChange?.(next);
  };
  // ponytail: read once per render, not on resize — the sheet is modal, the desktop popover isn't.
  const compact = typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 820px)').matches;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const active = streams.find((s) => s.id === activeStreamId) ?? streams[0];

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Tabbing out closes it. A click on a non-focusable spot inside the panel
  // blurs with no relatedTarget, so only a real focus move elsewhere counts.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (open && next instanceof Node && !e.currentTarget.contains(next)) setOpen(false);
  };

  const status = (s: SelectorStream) => {
    if (s.live === undefined) {
      return { label: s.durationMs ? `REPLAY · ${formatWindow(s.durationMs)}` : 'REPLAY', live: true, accent: false };
    }
    return s.live
      ? { label: t('transmissionLive'), live: true, accent: true }
      : { label: t('transmissionOffline'), live: false, accent: false };
  };

  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <div className={styles.wrapper} onBlur={onBlur}>
      <button
        ref={triggerRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen(!open)}
        aria-label={`${t('switchTransmission')}: ${active?.title ?? ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Radio size={16} aria-hidden="true" />
        <span className={styles.triggerLabel}>{active?.title}</span>
        <Chevron size={14} aria-hidden="true" className={styles.triggerLabel} />
      </button>

      {open && (
        <>
          <div className={styles.scrim} data-testid="transmission-scrim" onClick={close} />
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t('transmissions')}
            aria-modal={compact || undefined}
            className={styles.panel}
          >
            <span className={styles.handle} aria-hidden="true" />
            <div className={styles.panelHeader}>
              <span className={styles.eyebrow}>{t('transmissions')}</span>
              <span className={styles.count}>{streams.length}</span>
              <button className={styles.closeBtn} onClick={close} aria-label={t('closePanel')}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            {streams.map((s) => {
              const isActive = s.id === active?.id;
              const st = status(s);
              return (
                <button
                  key={s.id}
                  aria-pressed={isActive}
                  className={`${styles.row} ${isActive ? styles.rowActive : ''}`}
                  onClick={() => {
                    onStreamChange(s.id);
                    close();
                  }}
                >
                  <span className={`${styles.dot} ${st.live ? styles.dotLive : ''}`} aria-hidden="true" />
                  <span className={styles.rowText}>
                    <span className={styles.rowTitle}>{s.title}</span>
                    <span className={`${styles.rowStatus} ${st.accent ? styles.rowStatusLive : ''}`}>{st.label}</span>
                  </span>
                  {isActive && <Check size={16} aria-hidden="true" className={styles.check} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
