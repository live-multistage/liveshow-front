'use client';

import { useEffect, useMemo } from 'react';
import {
  mailingPreviewRequestSchema, type MailingPreviewRequest, type MailingPreviewResponse, type MailingTemplateDraft,
} from '@live-show/api-contracts';
import { usePreviewMailingMutation } from '../mutations/mailing.mutations';

// 500 ms after the last edit keeps a steady typist at ≤ 2 req/s, inside the
// preview throttle of 120/min (R13).
export function useDebouncedPreview(draft: MailingTemplateDraft, delayMs = 500) {
  const { mutate, data, isError } = usePreviewMailingMutation();
  const { name: _name, ...content } = draft;
  const serialized = JSON.stringify(content);
  const parsed = useMemo(() => mailingPreviewRequestSchema.safeParse(JSON.parse(serialized)), [serialized]);

  useEffect(() => {
    if (!parsed.success) return;
    // Cast: tsconfig is not `strict`, so zod infers every key as optional.
    const id = setTimeout(() => mutate(parsed.data as MailingPreviewRequest), delayMs);
    return () => clearTimeout(id);
  }, [parsed, delayMs, mutate]);

  return { preview: (data ?? null) as MailingPreviewResponse | null, invalid: !parsed.success, isError };
}
