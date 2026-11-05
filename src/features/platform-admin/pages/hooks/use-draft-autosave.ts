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
  | { kind: 'conflict'; conflict: DraftConflict };

interface Args {
  pageId: string;
  document: PageDocument;
  baseRevision: number;
  dirty: boolean;
  onSaved: (r: { draftRevision: number; draftUpdatedAt: string }) => void;
  onConflict: () => void;
  delayMs?: number;
}

const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 30000;
const GENERIC_INVALID: AutosaveIssue = { path: '', message: 'Não foi possível salvar: dados inválidos.' };

function backendIssues(error: unknown): AutosaveIssue[] {
  const errors = (error as { response?: { data?: { errors?: unknown } } })?.response?.data?.errors;
  if (!Array.isArray(errors) || errors.length === 0) return [GENERIC_INVALID];
  return errors.map((e: { field?: string; message?: string }) => ({
    path: e.field ?? '',
    message: e.message ?? GENERIC_INVALID.message,
  }));
}

export function useDraftAutosave(args: Args): { status: AutosaveStatus; saveNow: () => void; flushing: boolean } {
  const { document, dirty, baseRevision, delayMs = 800 } = args;
  const [status, setStatus] = useState<AutosaveStatus>({ kind: 'idle' });

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
    revisionRef.current = baseRevision;
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
    try {
      const saved = await pagesService.saveDraft(argsRef.current.pageId, { document: parsed.data, baseRevision: revisionRef.current });
      inFlight.current = false;
      if (!mounted.current) return;
      revisionRef.current = saved.draftRevision;
      attempts.current = 0;
      argsRef.current.onSaved(saved);
      // Edited while saving: send the newest document right away with the revision just returned.
      if (argsRef.current.document !== sent) return void run();
      setStatus({ kind: 'saved', at: new Date() });
    } catch (error) {
      inFlight.current = false;
      if (!mounted.current) return;
      if (isDraftConflict(error)) {
        locked.current = true;
        setStatus({ kind: 'conflict', conflict: error.response!.data! });
        argsRef.current.onConflict();
        return;
      }
      if ((error as { response?: { status?: number } })?.response?.status === 400) {
        setStatus({ kind: 'invalid', issues: backendIssues(error) });
        return;
      }
      attempts.current += 1;
      const wait = Math.min(RETRY_BASE_MS * 2 ** (attempts.current - 1), RETRY_MAX_MS);
      setStatus({ kind: 'error', attempt: attempts.current, nextRetryAt: new Date(Date.now() + wait) });
      retryTimer.current = setTimeout(() => void run(), wait);
    }
  }, []);

  useEffect(() => {
    if (!dirty || locked.current || inFlight.current) return;
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
    };
  }, []);

  const warn = dirty || status.kind === 'saving' || status.kind === 'pending' || status.kind === 'error';
  useEffect(() => {
    if (!warn) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [warn]);

  const saveNow = useCallback(() => void run(), [run]);

  return { status, saveNow, flushing: status.kind === 'saving' };
}
