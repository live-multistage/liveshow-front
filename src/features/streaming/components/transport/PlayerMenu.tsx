'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import styles from './transport-controls.module.scss';

export interface PlayerMenuItem {
  id: string;
  label: string;
}

interface PlayerMenuProps {
  items: PlayerMenuItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  // Trigger button content (icon or text). The button itself is owned here so
  // every menu keeps the same open/close and select-then-close behavior.
  trigger: ReactNode;
  triggerClassName: string;
  ariaLabel?: string;
  title?: string;
  // Panel variant (audio selector): eyebrow heading, check on the active row,
  // tag on the default row, bottom sheet at mobile widths.
  panel?: {
    eyebrow: string;
    defaultId?: string;
    defaultTag: string;
    openTriggerClassName: string;
    closeLabel: string;
    // Shown beside the icon at mobile widths only (CSS hides it above 820px).
    triggerLabel?: string;
  };
}

// The player's own pop-up menu, anchored above its trigger. Deliberately not
// the design-system DropdownMenu: that one portals to <body>, which is
// invisible while the player container is the fullscreen element.
export function PlayerMenu({ items, activeId, onSelect, trigger, triggerClassName, ariaLabel, title, panel }: PlayerMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isPanel = Boolean(panel);

  // Panel only: Esc closes and hands focus back to the trigger; on open, focus
  // moves to the active option. Listener lives only while the panel is open.
  useEffect(() => {
    if (!isPanel || !open) return;
    panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isPanel, open]);

  return (
    <div className={styles.menuWrapper}>
      {open && (
        <>
        {panel && <div className={styles.panelScrim} data-testid="panel-scrim" onClick={() => setOpen(false)} />}
        <div ref={panelRef} className={panel ? styles.panel : styles.menu} role={panel ? 'dialog' : undefined} aria-label={panel ? ariaLabel : undefined}>
          {panel && (
            <>
              <span className={styles.panelHandle} />
              <div className={styles.panelHeader}>
                <span className={styles.panelEyebrow}>{panel.eyebrow}</span>
                <button
                  className={styles.panelClose}
                  aria-label={panel.closeLabel}
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </>
          )}
          {items.map((item) => {
            const active = item.id === activeId;
            const itemClass = panel ? (active ? styles.panelItemActive : styles.panelItem) : active ? styles.menuItemActive : styles.menuItem;
            return (
              <button
                key={item.id}
                className={itemClass}
                aria-pressed={panel ? active : undefined}
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
              >
                {panel ? <span className={styles.panelItemLabel}>{item.label}</span> : item.label}
                {panel && item.id === panel.defaultId && <span className={styles.panelTag}>{panel.defaultTag}</span>}
                {panel && active && <Check size={15} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        </>
      )}
      <button
        ref={triggerRef}
        className={panel && open ? `${triggerClassName} ${panel.openTriggerClassName}` : triggerClassName}
        onClick={() => setOpen((s) => !s)}
        aria-label={ariaLabel}
        title={title}
        aria-expanded={panel ? open : undefined}
      >
        {trigger}
        {panel?.triggerLabel && <span className={styles.triggerLabel}>{panel.triggerLabel}</span>}
      </button>
    </div>
  );
}
