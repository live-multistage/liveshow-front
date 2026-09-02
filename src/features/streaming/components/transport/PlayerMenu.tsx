'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
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
}

// The player's own pop-up menu, anchored above its trigger. Deliberately not
// the design-system DropdownMenu: that one portals to <body>, which is
// invisible while the player container is the fullscreen element.
export function PlayerMenu({ items, activeId, onSelect, trigger, triggerClassName, ariaLabel, title }: PlayerMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.menuWrapper}>
      {open && (
        <div className={styles.menu}>
          {items.map((item) => (
            <button
              key={item.id}
              className={item.id === activeId ? styles.menuItemActive : styles.menuItem}
              onClick={() => {
                onSelect(item.id);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <button
        className={triggerClassName}
        onClick={() => setOpen((s) => !s)}
        aria-label={ariaLabel}
        title={title}
      >
        {trigger}
      </button>
    </div>
  );
}
