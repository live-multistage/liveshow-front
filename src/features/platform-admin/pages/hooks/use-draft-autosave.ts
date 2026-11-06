'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { pageDraftSchema, type DraftConflict, type PageDocument } from '@live-show/api-contracts';
import { isDraftConflict, pagesService } from '../services/pages.service';

export type AutosaveIssue = { path: string; message: string };
export type AutosaveStatus =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'invalid'; issues: AutosaveIssue[] }
  | { kind: 'error'; attempt: number; nextRetryAt: Date }
  | { kind: 'conflict'; conflict: DraftConflict }
  | { kind: 'blocked'; code: string; message: string };

interface Args {
  pageId: string;
  document: PageDocument;
  baseRevision: number;
  dirty: boolean;
  /** `document` is the one that was sent: pass it to `markSaved` so edits made during the save keep the editor dirty. */
  onSaved: (r: { draftRevision: number; draftUpdatedAt: string; document: PageDocument }) => void;
  onConflict: () => void;
  delayMs?: number;
}

const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30000;
const RETRYABLE_STATUSES = new Set([408, 429]);
const GENERIC_INVALID: AutosaveIssue = { path: '', message: 'Não foi possível salvar: dados inválidos.' };

function isRetryable(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === undefined || status >= 500 || RETRYABLE_STATUSES.has(status);
}

function blockedStatus(error: unknown): AutosaveStatus {
  const data = (error as { response?: { data?: { code?: string; message?: string } } }).response?.data;
  return { kind: 'blocked', code: data?.code ?? 'UNKNOWN', message: data?.message ?? 'Não foi possível salvar.' };
}

function backendIssues(error: unknown): AutosaveIssue[] {
  const errors = (error as { response?: { data?: { errors?: unknown } } })?.response?.data?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return [GENERIC_INVALID];
  return errors.map((e: { field?: string; message?: string }) => ({
    path: e.field ?? '',
    message: e.message ?? GENERIC_INVALID.message,
  }));
}

/**
 * Debounced draft autosave with optimistic locking.
 * The caller MUST mount it with `key={pageId}`: state and the revision ref are not reset on pageId change.
 */
export function useDraftAutosave(args: Args): { status: AutosaveStatus; saveNow: () => void; flushing: boolean } {
  const { document, dirty, baseRevision, delayMs = 800 } = args;
  const [status, setStatus] = useState<AutosaveStatus>({ kind: 'idle' });

  // Intentional render-time write: read-only ref so async callbacks see the latest props.
  const argsRef = useRef(args);
  argsRef.current = args;
  const revisionRef = useRef(baseRevision);
  const inFlight = useRef(false);
  const locked = useRef(false);
  const mounted = useRef(true);
  const attempts = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const retryTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    revisionRef.current = Math.max(revisionRef.current, baseRevision);
  }, [baseRevision]);

  const run = useCallback(async () => {
    if (locked.current || inFlight.current || !mounted.current) return;
    clearTimeout(debounceTimer.current);
    clearTimeout(retryTimer.current);
    const sent = argsRef.current.document;
    const parsed = pageDraftSchema.safeParse(sent);
    if (!parsed.success) {
      setStatus({
        kind: 'invalid',
        issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    inFlight.current = true;
    setStatus({ kind: 'saving' });
    const pageId = argsRef.current.pageId;
    let saved: { draftRevision: number; draftUpdatedAt: string };
    try {
      saved = await pagesService.saveDraft(pageId, { document: parsed.data, baseRevision: revisionRef.current });
    } catch (error) {
      inFlight.current = false;
      if (!mounted.current || pageId !== argsRef.current.pageId) return;
      if (isDraftConflict(error)) {
        locked.current = true;
        setStatus({ kind: 'conflict', conflict: error.response!.data! });
        argsRef.current.onConflict();
        return;
      }
      if ((error as { response?: { status?: number } })?.response?.status === 400) {
        // Edited while saving: the client validation decides whether it is still invalid.
        if (argsRef.current.document !== sent) return void run();
        setStatus({ kind: 'invalid', issues: backendIssues(error) });
        return;
      }
      if (!isRetryable(error)) {
        locked.current = true;
        setStatus(blockedStatus(error));
        return;
      }
      attempts.current += 1;
      const wait = Math.min(RETRY_BASE_MS * 2 ** (attempts.current - 1), RETRY_MAX_MS);
      setStatus({ kind: 'error', attempt: attempts.current, nextRetryAt: new Date(Date.now() + wait) });
      retryTimer.current = setTimeout(() => void run(), wait);
      return;
    }
    inFlight.current = false;
    if (!mounted.current || pageId !== argsRef.current.pageId) return;
    revisionRef.current = saved.draftRevision;
    attempts.current = 0;
    try {
      argsRef.current.onSaved({ ...saved, document: sent });
    } catch (callbackError) {
      // A failing callback must not look like a failed save.
      console.error(callbackError);
    }
    // Edited while saving: send the newest document right away with the revision just returned.
    if (argsRef.current.document !== sent) return void run();
    setStatus({ kind: 'saved', at: new Date() });
  }, []);

  useEffect(() => {
    if (!dirty) {
      setStatus((s) => (s.kind === 'pending' ? { kind: 'idle' } : s));
      return;
    }
    if (locked.current || inFlight.current) return;
    setStatus({ kind: 'pending' });
    debounceTimer.current = setTimeout(() => void run(), delayMs);
    return () => clearTimeout(debounceTimer.current);
  }, [document, dirty, delayMs, run]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(debounceTimer.current);
      clearTimeout(retryTimer.current);
      // Client-side navigation would drop a pending (or retrying) edit: send it once, fire-and-forget.
      const { pageId, document: latest, dirty: unsaved } = argsRef.current;
      if (!unsaved || locked.current || inFlight.current) return;
      const parsed = pageDraftSchema.safeParse(latest);
      if (parsed.success) void Promise.resolve(pagesService.saveDraft(pageId, { document: parsed.data, baseRevision: revisionRef.current })).catch(() => undefined);
    };
  }, []);

  const warn = dirty || status.kind === 'saving' || status.kind === 'pending' || status.kind === 'error';
  useEffect(() => {
    if (!warn) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [warn]);

  const statusKind = status.kind;
  const saveNow = useCallback(() => {
    if (!argsRef.current.dirty && statusKind !== 'error') return;
    void run();
  }, [run, statusKind]);

  return { status, saveNow, flushing: status.kind === 'saving' };
}
