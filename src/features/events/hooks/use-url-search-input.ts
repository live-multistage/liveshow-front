'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';

const COMMIT_DEBOUNCE_MS = 300;

// Text input backed by a URL param: typing stays local and commits once it
// settles; a URL change that did not come from here (Back, clear link) resets
// the input. A commit still in flight must not overwrite newer keystrokes,
// hence comparing against the last committed term rather than the input.
export function useUrlSearchInput(urlTerm: string, onCommit: (term: string) => void) {
  const [value, setValue] = useState(urlTerm);
  const committed = useRef(urlTerm);
  const settled = useDebouncedValue(value, COMMIT_DEBOUNCE_MS);

  useEffect(() => {
    if (urlTerm === committed.current) return;
    committed.current = urlTerm;
    setValue(urlTerm);
  }, [urlTerm]);

  useEffect(() => {
    const term = settled.trim();
    if (term === committed.current) return;
    committed.current = term;
    onCommit(term);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a settled value commits
  }, [settled]);

  return [value, setValue] as const;
}
