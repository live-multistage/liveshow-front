import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "./utils";
import styles from "./pagination.module.scss";

// Window = unique sorted [1, page-1, page, page+1, pageCount] clamped to
// range; a gap between non-adjacent numbers renders as 'gap' (an ellipsis).
export function paginationWindow(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 0) return [];

  const candidates = [1, page - 1, page, page + 1, pageCount];
  const nums = [...new Set(candidates.filter((n) => n >= 1 && n <= pageCount))].sort((a, b) => a - b);

  const result: Array<number | "gap"> = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) result.push("gap");
    result.push(n);
  });
  return result;
}

export interface PaginationLabels {
  prev: string;
  next: string;
  nav: string;
  prevAria: string;
  nextAria: string;
}

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  labels: PaginationLabels;
  /** When provided, page controls render as <a href> (crawlable) instead of <button>. */
  hrefFor?: (page: number) => string;
  className?: string;
}

function Pagination({ page, pageCount, onPageChange, labels, hrefFor, className }: PaginationProps) {
  // ponytail: nothing to page through.
  if (pageCount <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < pageCount;

  const renderControl = (target: number, className: string, content: React.ReactNode, ariaLabel?: string) => {
    if (hrefFor) {
      return (
        <a
          href={hrefFor(target)}
          className={className}
          aria-label={ariaLabel}
          onClick={(e) => {
            // Plain left click navigates in place; modifier/middle clicks keep
            // the native anchor behaviour (new tab) — the href is real.
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            e.preventDefault();
            onPageChange(target);
          }}
        >
          {content}
        </a>
      );
    }
    return (
      <button type="button" className={className} aria-label={ariaLabel} onClick={() => onPageChange(target)}>
        {content}
      </button>
    );
  };

  const renderArrow = (direction: "prev" | "next") => {
    const enabled = direction === "prev" ? canPrev : canNext;
    const target = direction === "prev" ? page - 1 : page + 1;
    const label = direction === "prev" ? labels.prev : labels.next;
    const aria = direction === "prev" ? labels.prevAria : labels.nextAria;
    const content =
      direction === "prev" ? (
        <>
          <ChevronLeftIcon size={13} />
          {label}
        </>
      ) : (
        <>
          {label}
          <ChevronRightIcon size={13} />
        </>
      );

    if (!enabled) {
      return (
        <button type="button" className={styles.arrowButton} disabled aria-label={aria}>
          {content}
        </button>
      );
    }

    return renderControl(target, styles.arrowButton, content, aria);
  };

  return (
    <nav aria-label={labels.nav} className={cn(styles.nav, className)}>
      {renderArrow("prev")}
      {paginationWindow(page, pageCount).map((item, i) => {
        if (item === "gap") {
          return (
            <span key={`gap-${i}`} className={styles.gap} aria-hidden="true">
              …
            </span>
          );
        }

        const isCurrent = item === page;
        if (isCurrent) {
          return (
            <span key={item} className={cn(styles.pageButton, styles.pageButtonCurrent)} aria-current="page">
              {item}
            </span>
          );
        }

        return <React.Fragment key={item}>{renderControl(item, styles.pageButton, item)}</React.Fragment>;
      })}
      {renderArrow("next")}
    </nav>
  );
}

export { Pagination };
