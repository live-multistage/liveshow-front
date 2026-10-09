import * as React from "react";

import { cn } from "./utils";
import styles from "./textarea.module.scss";

type TextareaProps = React.ComponentProps<"textarea"> & {
  /** Monospace face, for markdown / code. */
  mono?: boolean;
  /** Shows a "length/max" counter. Soft limit: going over warns, never blocks (use maxLength to block). */
  max?: number;
  /** Error message under the field; also sets aria-invalid. */
  error?: string;
};

function Textarea({
  className,
  mono = false,
  max,
  error,
  "aria-describedby": describedBy,
  value,
  defaultValue,
  onChange,
  ...props
}: TextareaProps) {
  const [typed, setTyped] = React.useState(String(defaultValue ?? "").length);
  const length = value !== undefined ? String(value).length : typed;
  const over = max !== undefined && length > max;
  const errorId = React.useId();

  return (
    <div className={styles.root}>
      <div className={styles.field}>
        <textarea
          data-slot="textarea"
          className={cn(
            styles.textarea,
            mono && styles.mono,
            max !== undefined && styles.withCounter,
            over && styles.over,
            className,
          )}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={[describedBy, error ? errorId : undefined].filter(Boolean).join(" ") || undefined}
          onChange={(e) => {
            setTyped(e.target.value.length);
            onChange?.(e);
          }}
          {...props}
        />
        {max !== undefined && (
          <span className={cn(styles.counter, over && styles.counterOver)}>
            {length}/{max}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

export { Textarea };
export type { TextareaProps };
