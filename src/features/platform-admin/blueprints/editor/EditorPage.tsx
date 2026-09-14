'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { ReactFlowProvider } from '@xyflow/react';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@live-show/design-system';
import type { BlueprintCatalogEntry, BlueprintVersionDto } from '@live-show/api-contracts';
import type { AppError } from '@/lib/http/errors';
import { useBlueprintCatalogQuery, useBlueprintQuery } from '../queries/blueprints.queries';
import { usePublishBlueprintVersionMutation, useSaveBlueprintVersionMutation } from '../mutations/blueprints.mutations';
import { Canvas } from './Canvas';
import { EditorToolbar, type BadgeTone } from './EditorToolbar';
import { Inspector } from './Inspector';
import { Palette } from './Palette';
import { ProblemsFooter } from './ProblemsFooter';
import { useWideScreen } from './useWideScreen';
import { catalogKey, errorCountByNode, useEditorGraph } from './useEditorGraph';
import styles from './EditorPage.module.scss';

interface Props {
  id: string;
  /** `?version=` — a published/active version opens read-only. */
  versionId?: string;
  /** `?node=` — selected and centered on load (run drawer, analysis links). */
  nodeId?: string;
}

// Design group C. "Validar" and "Salvar rascunho" both POST a new version
// (stage 1 has no dry-run analyze endpoint) and show the returned analysis;
// "Publicar" publishes the draft saved last, only when it is clean and saved.
export function EditorPage({ id, versionId, nodeId }: Props) {
  const t = useTranslations('platformAdmin.blueprints');
  const router = useRouter();
  const wide = useWideScreen();
  const detail = useBlueprintQuery(id);
  const catalogQuery = useBlueprintCatalogQuery();
  const save = useSaveBlueprintVersionMutation();
  const publish = usePublishBlueprintVersionMutation();
  const { state, dispatch, graph, dirty } = useEditorGraph();
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [saved, setSaved] = useState<BlueprintVersionDto | null>(null);
  const [savingVia, setSavingVia] = useState<'validate' | 'save' | null>(null);
  const [footerOpen, setFooterOpen] = useState(true);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [focus, setFocus] = useState<{ id: string; seq: number } | null>(null);

  const detailHref = `/dashboard/platform/blueprints/${id}`;
  const versions = detail.data?.versions;
  const requestKey = versionId ?? 'latest';
  const requested = versions && (versionId ? versions.find((v) => v.id === versionId) : versions[0]);

  // Load once per requested version; later refetches (after a save) must not
  // overwrite the graph being edited.
  useEffect(() => {
    if (!versions || loadedKey === requestKey || (versionId && !requested)) return;
    setLoadedKey(requestKey);
    setBaseId(requested?.id ?? null);
    setSaved(null);
    dispatch({ type: 'load', graph: requested?.graph ?? null, selectedId: nodeId ?? null });
    if (nodeId) setFocus({ id: nodeId, seq: 0 });
  }, [versions, requested, requestKey, loadedKey, versionId, nodeId, dispatch]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const catalog = useMemo(
    () => new Map<string, BlueprintCatalogEntry>((catalogQuery.data ?? []).map((e) => [catalogKey(e.key, e.version), e])),
    [catalogQuery.data],
  );
  const base = versions?.find((v) => v.id === baseId) ?? null;
  const current = saved ?? base;
  const errors = useMemo(() => current?.analysis.errors ?? [], [current]);
  const errorCounts = useMemo(() => errorCountByNode(errors), [errors]);
  const readOnly = !!versionId && !!base?.publishedAt;

  const focusNode = useCallback((target: string) => {
    dispatch({ type: 'select', id: target });
    setFocus((f) => ({ id: target, seq: (f?.seq ?? 0) + 1 }));
  }, [dispatch]);

  const errorMessage = (err: AppError) => (err.code && t.has(`errors.${err.code}`) ? t(`errors.${err.code}`) : t('errors.GENERIC'));

  function onSave(via: 'validate' | 'save') {
    const revision = state.revision;
    setSavingVia(via);
    save.mutate({ id, graph }, {
      onSuccess: (v) => {
        setSaved(v);
        dispatch({ type: 'saved', revision });
        setFooterOpen(true);
        toast.success(t('editor.savedToast', { version: v.version, count: v.analysis.errors.length }));
      },
      onError: (err) => toast.error(errorMessage(err)),
      onSettled: () => setSavingVia(null),
    });
  }

  function onPublish() {
    if (!current) return;
    publish.mutate({ id, versionId: current.id }, {
      onSuccess: (v) => {
        setSaved(v);
        toast.success(t('editor.publishedToast', { version: v.version }));
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  }

  function onDuplicate() {
    if (!base) return;
    save.mutate({ id, graph: base.graph }, {
      onSuccess: (v) => router.replace(`/dashboard/platform/blueprints/${id}/editor?version=${v.id}`),
      onError: (err) => toast.error(errorMessage(err)),
    });
  }

  function onBack() {
    if (dirty) setConfirmLeave(true);
    else router.push(detailHref);
  }

  if (!wide) {
    return (
      <div className={styles.small}>
        <p>{t('editor.smallScreen')}</p>
        <Link className={styles.smallLink} href={detailHref}>{t('editor.back')}</Link>
      </div>
    );
  }

  const missingVersion = !!versionId && !!versions && !requested && !detail.isFetching;
  if (detail.isError || catalogQuery.isError || missingVersion) {
    return (
      <div className={styles.small}>
        <p>{detail.isError || missingVersion ? t('detail.notFound') : t('editor.loadError')}</p>
        <Link className={styles.smallLink} href={detailHref}>{t('editor.back')}</Link>
      </div>
    );
  }

  if (!detail.data || loadedKey === null) return <div className={styles.root}><div className={styles.loading} /></div>;

  const hasDraft = !!current && !current.publishedAt;
  const publishBlockedReason = hasDraft && errors.length > 0
    ? t('editor.publishBlocked')
    : !hasDraft || dirty ? t('editor.saveBeforePublish') : null;

  // The badge names the version on screen; editing on top of a published one
  // is an unsaved new draft until "Salvar rascunho".
  const shown = current && (readOnly || !current.publishedAt || !dirty) ? current : null;
  const tone: BadgeTone = !shown?.publishedAt ? 'draft' : shown.id === detail.data.activeVersionId ? 'active' : 'published';
  const badge = [`${t(`editor.badge.${tone}`)}${shown ? ` v${shown.version}` : ''}`, readOnly ? t('editor.badge.readOnly') : null]
    .filter(Boolean).join(' · ');
  const summary = [t('editor.summary', { nodes: state.nodes.length, edges: state.edges.length }), dirty ? t('editor.unsaved') : null]
    .filter(Boolean).join(' · ');

  return (
    <div className={styles.root}>
      <EditorToolbar
        name={detail.data.name}
        badge={badge}
        tone={tone}
        errorCount={errors.length}
        summary={summary}
        readOnly={readOnly}
        savingVia={savingVia}
        publishing={publish.isPending}
        duplicating={save.isPending}
        publishBlockedReason={publishBlockedReason}
        onBack={onBack}
        onSave={onSave}
        onPublish={onPublish}
        onDuplicate={onDuplicate}
      />
      {readOnly && (
        <div className={styles.readOnlyBanner} role="status">
          <ShieldCheck size={15} aria-hidden />
          <span>{tone === 'active' ? t('editor.readOnlyBanner') : t('editor.readOnlyBannerPublished')}</span>
        </div>
      )}
      <div className={styles.body}>
        <Palette
          catalog={catalogQuery.data}
          loading={catalogQuery.isLoading}
          disabled={readOnly}
          highlightTriggers={state.nodes.length === 0}
          onAdd={(entry) => dispatch({ type: 'add', entry })}
        />
        {catalogQuery.data ? (
          <ReactFlowProvider>
            <Canvas state={state} dispatch={dispatch} catalog={catalog} errorCounts={errorCounts} readOnly={readOnly} focus={focus} />
          </ReactFlowProvider>
        ) : <div className={styles.canvasLoading} />}
        <Inspector state={state} dispatch={dispatch} catalog={catalog} errors={errors} readOnly={readOnly} />
      </div>
      <ProblemsFooter errors={errors} open={footerOpen} onToggle={() => setFooterOpen((o) => !o)} onSelectNode={focusNode} />

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editor.discardTitle')}</DialogTitle>
          </DialogHeader>
          <p className={styles.dialogBody}>{t('editor.discardBody')}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLeave(false)}>{t('editor.keepEditing')}</Button>
            <Button variant="destructive" onClick={() => router.push(detailHref)}>{t('editor.discard')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
