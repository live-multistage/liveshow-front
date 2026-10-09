"use client";

import * as React from "react";

import { cn } from "./utils";
import styles from "./tabs.module.scss";

type TabItem = {
  value: string;
  label: React.ReactNode;
  /** Small tag after the label, e.g. a count or "required". */
  badge?: React.ReactNode;
  /** "Changed" dot after the label. */
  dot?: boolean;
  dotLabel?: string;
  disabled?: boolean;
};

type TabsProps = {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Accessible name of the tablist. */
  label: string;
  /** "mono" sets labels in the mono face (locale codes). */
  variant?: "default" | "mono";
  className?: string;
  /** Panel content; a function receives the active value. Omit to render only the tablist. */
  children?: React.ReactNode | ((value: string) => React.ReactNode);
};

function Tabs({
  items,
  value,
  defaultValue,
  onValueChange,
  label,
  variant = "default",
  className,
  children,
}: TabsProps) {
  const baseId = React.useId();
  const [inner, setInner] = React.useState(defaultValue ?? items[0]?.value ?? "");
  const active = value ?? inner;
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (next: string) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabled = items.filter((i) => !i.disabled);
    const pos = enabled.findIndex((i) => i.value === items[index].value);
    const move: Record<string, number> = {
      ArrowRight: (pos + 1) % enabled.length,
      ArrowLeft: (pos - 1 + enabled.length) % enabled.length,
      Home: 0,
      End: enabled.length - 1,
    };
    if (!(e.key in move)) return;
    e.preventDefault();
    refs.current[enabled[move[e.key]].value]?.focus();
  };

  const tabId = (v: string) => `${baseId}-tab-${v}`;
  const panelId = `${baseId}-panel`;

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className={styles.list}>
        {items.map((item, index) => {
          const selected = item.value === active;
          return (
            <button
              key={item.value}
              ref={(el) => {
                refs.current[item.value] = el;
              }}
              type="button"
              role="tab"
              id={tabId(item.value)}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              className={cn(styles.tab, variant === "mono" && styles.mono, selected && styles.active)}
              onClick={() => select(item.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
            >
              {item.label}
              {item.dot && <span className={styles.dot} role="img" aria-label={item.dotLabel} title={item.dotLabel} />}
              {item.badge != null && <span className={styles.badge}>{item.badge}</span>}
            </button>
          );
        })}
      </div>
      {children != null && (
        <div role="tabpanel" id={panelId} aria-labelledby={tabId(active)} tabIndex={-1}>
          {typeof children === "function" ? children(active) : children}
        </div>
      )}
    </div>
  );
}

export { Tabs };
export type { TabItem, TabsProps };
