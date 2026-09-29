'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { isAxiosError } from 'axios';
import { AlertCircle, Inbox, Trash2, X } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
  SimpleCustomSelect,
  Switch,
} from '@live-show/design-system';
import { isValidEventName } from '@live-show/api-contracts';
import type { PlanEvent, PlanEventStatus, PlanProperty, PlanPropertyType } from '@live-show/api-contracts';
import { TrackingShell } from './TrackingShell';
import { useTrackingPlanQuery, useUnplannedEventsQuery, useUpsertPlanEventMutation } from '../queries/get-plan';
import styles from './TrackingPlanPage.module.scss';

interface Props {
  trackingEnabled: boolean;
}

// ponytail: DS has no dedicated property-name-input pattern component; the
// design's property name regex is loosely validated client-side to match the
// spec, actual enforcement stays server-side.
const PROPERTY_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
const PROPERTY_TYPES: PlanPropertyType[] = ['string', 'number', 'boolean', 'enum', 'object', 'array'];
const STATUS_ORDER: PlanEventStatus[] = ['draft', 'live', 'deprecated'];

type DraftProperty = PlanProperty & { key: string };

interface EditorState {
  originalName: string | null; // null = creating a new event
  name: string;
  description: string;
  owner: string;
  status: PlanEventStatus;
  properties: DraftProperty[];
}

let keySeq = 0;
function nextKey(): string {
  keySeq += 1;
  return `prop-${keySeq}`;
}

function emptyProperty(): DraftProperty {
  return { key: nextKey(), name: '', type: 'string', required: false, description: '' };
}

function toEditorState(event: PlanEvent | null, prefillName?: string): EditorState {
  if (!event) {
    return {
      originalName: null,
      name: prefillName ?? '',
      description: '',
      owner: '',
      status: 'draft',
      properties: [],
    };
  }
  return {
    originalName: event.name,
    name: event.name,
    description: event.description,
    owner: event.owner ?? '',
    status: event.status,
    properties: event.properties.map((p) => ({ ...p, key: nextKey() })),
  };
}

export function TrackingPlanPage({ trackingEnabled }: Props) {
  const t = useTranslations('platformAdmin.tracking');
  const { data: plan, isLoading, isError, refetch } = useTrackingPlanQuery();
  const { data: unplanned } = useUnplannedEventsQuery();
  const upsert = useUpsertPlanEventMutation();

  const [tab, setTab] = useState<'planned' | 'unplanned'>('planned');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [deprecateTarget, setDeprecateTarget] = useState<PlanEventStatus | null>(null);

  const title = t('plan.title');
  const subtitle = t('plan.subtitle');

  function openCreate(prefillName?: string) {
    setEditor(toEditorState(null, prefillName));
    setServerError(null);
  }

  function openEdit(event: PlanEvent) {
    setEditor(toEditorState(event));
    setServerError(null);
  }

  function closeEditor() {
    setEditor(null);
    setServerError(null);
    setDeprecateTarget(null);
  }

  function updateProperty(key: string, patch: Partial<DraftProperty>) {
    setEditor((e) => (e ? { ...e, properties: e.properties.map((p) => (p.key === key ? { ...p, ...patch } : p)) } : e));
  }

  function addProperty() {
    setEditor((e) => (e ? { ...e, properties: [...e.properties, emptyProperty()] } : e));
  }

  function removeProperty(key: string) {
    setEditor((e) => (e ? { ...e, properties: e.properties.filter((p) => p.key !== key) } : e));
  }

  function addEnumValue(key: string, value: string) {
    const v = value.trim();
    if (!v) return;
    setEditor((e) =>
      e
        ? {
            ...e,
            properties: e.properties.map((p) =>
              p.key === key ? { ...p, enumValues: [...(p.enumValues ?? []), v] } : p,
            ),
          }
        : e,
    );
  }

  function removeEnumValue(key: string, index: number) {
    setEditor((e) =>
      e
        ? {
            ...e,
            properties: e.properties.map((p) =>
              p.key === key ? { ...p, enumValues: (p.enumValues ?? []).filter((_, i) => i !== index) } : p,
            ),
          }
        : e,
    );
  }

  function propertyError(p: DraftProperty, all: DraftProperty[]): string | null {
    if (!p.name.trim() || !PROPERTY_NAME_PATTERN.test(p.name)) return t('plan.editor.propertyNameError');
    if (all.filter((x) => x.name === p.name).length > 1) return t('plan.editor.nameDuplicateError');
    if (p.type === 'enum' && (!p.enumValues || p.enumValues.length === 0)) return t('plan.editor.enumValueRequired');
    return null;
  }

  function isNameValid(e: EditorState): boolean {
    if (!isValidEventName(e.name)) return false;
    if (e.originalName === null && plan?.some((p) => p.name === e.name)) return false;
    return true;
  }

  function isEditorValid(e: EditorState): boolean {
    if (!isNameValid(e)) return false;
    return e.properties.every((p) => propertyError(p, e.properties) === null);
  }

  async function handleSave() {
    if (!editor) return;
    if (!isEditorValid(editor)) return;
    setServerError(null);
    try {
      await upsert.mutateAsync({
        name: editor.name,
        payload: {
          description: editor.description,
          owner: editor.owner || null,
          status: editor.status,
          properties: editor.properties.map(({ key: _key, ...p }) => p),
        },
      });
      closeEditor();
    } catch (err) {
      const message = isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
      setServerError(message ?? t('plan.error'));
    }
  }

  function handleStatusClick(status: PlanEventStatus) {
    if (!editor) return;
    if (status === 'deprecated' && editor.originalName !== null && editor.status !== 'deprecated') {
      setDeprecateTarget(status);
      return;
    }
    setEditor({ ...editor, status });
  }

  function confirmDeprecate() {
    if (!editor) return;
    setEditor({ ...editor, status: 'deprecated' });
    setDeprecateTarget(null);
  }

  const actions = <Button onClick={() => openCreate()}>{t('plan.newEvent')}</Button>;

  if (isLoading) {
    return (
      <TrackingShell active="plan" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
        <div className={styles.tableSkeletonWrap}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={styles.rowSkeleton} />
          ))}
        </div>
      </TrackingShell>
    );
  }

  if (isError || !plan) {
    return (
      <TrackingShell active="plan" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
        <div className={styles.stateBox}>
          <div className={styles.errorIcon}>
            <AlertCircle size={28} />
          </div>
          <p className={styles.stateTitle}>{t('plan.error')}</p>
          <Button variant="outline" onClick={() => refetch()}>
            {t('shell.retry')}
          </Button>
        </div>
      </TrackingShell>
    );
  }

  if (plan.length === 0 && tab === 'planned') {
    return (
      <TrackingShell active="plan" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
        <div className={styles.stateBox}>
          <div className={styles.emptyIcon}>
            <Inbox size={30} />
          </div>
          <p className={styles.stateTitle}>{t('plan.empty.title')}</p>
          <p className={styles.stateHint}>{t('plan.empty.body')}</p>
          <Button onClick={() => openCreate()}>{t('plan.empty.cta')}</Button>
        </div>
      </TrackingShell>
    );
  }

  return (
    <TrackingShell active="plan" title={title} subtitle={subtitle} actions={actions} trackingEnabled={trackingEnabled}>
      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={tab === 'planned' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setTab('planned')}
            >
              {t('plan.tabs.planned')} <span className={styles.mono}>{plan.length}</span>
            </button>
            <button
              type="button"
              className={tab === 'unplanned' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => setTab('unplanned')}
            >
              {t('plan.tabs.unplanned')} <span className={styles.countPill}>{unplanned?.length ?? 0}</span>
            </button>
          </div>

          {tab === 'planned' ? (
            <div className={styles.card}>
              <div className={styles.headerRow}>
                <span>{t('plan.columns.event')}</span>
                <span>{t('plan.columns.owner')}</span>
                <span>{t('plan.columns.status')}</span>
                <span className={styles.right}>{t('plan.columns.props')}</span>
                <span className={styles.right}>{t('plan.columns.updated')}</span>
              </div>
              {plan.map((event) => (
                <button key={event.name} type="button" className={styles.row} onClick={() => openEdit(event)}>
                  <div className={styles.eventCell}>
                    <div className={event.status === 'deprecated' ? `${styles.eventName} ${styles.strike}` : styles.eventName}>
                      {event.name}
                    </div>
                    <div className={styles.eventDesc}>{event.description}</div>
                  </div>
                  <div className={styles.ownerCell}>{event.owner ?? '—'}</div>
                  <div>
                    <span className={`${styles.statusPill} ${styles[`status-${event.status}`]}`}>
                      {t(`plan.status.${event.status}`)}
                    </span>
                  </div>
                  <div className={`${styles.mono} ${styles.right}`}>{event.properties.length}</div>
                  <div className={`${styles.mono} ${styles.right} ${styles.muted}`}>{event.updatedAt}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.card}>
              <div className={styles.unplannedHeaderRow}>
                <span>{t('plan.columns.event')}</span>
                <span>{t('plan.columns.firstSeen')}</span>
                <span>{t('plan.columns.lastSeen')}</span>
                <span className={styles.right}>{t('plan.columns.count')}</span>
                <span />
              </div>
              {(unplanned ?? []).map((u) => (
                <div key={u.name} className={styles.unplannedRow}>
                  <span className={styles.mono}>{u.name}</span>
                  <span className={`${styles.mono} ${styles.muted}`}>{u.firstSeenAt}</span>
                  <span className={`${styles.mono} ${styles.muted}`}>{u.lastSeenAt}</span>
                  <span className={`${styles.mono} ${styles.right}`}>{u.count}</span>
                  <div className={styles.right}>
                    <Button variant="outline" size="sm" onClick={() => openCreate(u.name)}>
                      {t('plan.addToPlan')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editor && (
          <div className={styles.editorPanel}>
            <div className={styles.editorHeader}>
              <div>
                <div className={styles.editorEyebrow}>
                  {editor.originalName === null ? t('plan.editor.newTitle') : t('plan.editor.editTitle')}
                </div>
                <div className={`${styles.mono} ${styles.editorEventName}`}>{editor.name || '—'}</div>
              </div>
              <button type="button" className={styles.iconButton} onClick={closeEditor} aria-label={t('plan.editor.cancel')}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.editorBody}>
              {serverError && <div className={styles.serverError}>{serverError}</div>}

              <div>
                <label className={styles.label} htmlFor="plan-event-name">
                  {t('plan.editor.name')}
                </label>
                <Input
                  id="plan-event-name"
                  value={editor.name}
                  disabled={editor.originalName !== null}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                  className={!isNameValid(editor) && editor.name.length > 0 ? styles.inputError : undefined}
                />
                {!isNameValid(editor) &&
                  editor.name.length > 0 &&
                  (editor.originalName === null && plan.some((p) => p.name === editor.name) ? (
                    <div className={styles.fieldError}>{t('plan.editor.nameDuplicateError')}</div>
                  ) : (
                    <div className={styles.fieldError}>{t('plan.editor.nameFormatError')}</div>
                  ))}
              </div>

              <div>
                <label className={styles.label} htmlFor="plan-event-desc">
                  {t('plan.editor.description')}
                </label>
                <Input id="plan-event-desc" value={editor.description} onChange={(e) => setEditor({ ...editor, description: e.target.value })} />
              </div>

              <div className={styles.grid2}>
                <div>
                  <label className={styles.label} htmlFor="plan-event-owner">
                    {t('plan.editor.owner')}
                  </label>
                  <Input id="plan-event-owner" value={editor.owner} onChange={(e) => setEditor({ ...editor, owner: e.target.value })} />
                </div>
                <div>
                  <span className={styles.label}>{t('plan.editor.status')}</span>
                  <div className={styles.statusToggle}>
                    {STATUS_ORDER.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={editor.status === s ? `${styles.statusOption} ${styles[`statusOption-${s}`]}` : styles.statusOption}
                        onClick={() => handleStatusClick(s)}
                      >
                        {t(`plan.status.${s}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className={styles.propsHeader}>
                  <span className={styles.label}>{t('plan.editor.propertiesTitle', { count: editor.properties.length })}</span>
                </div>
                <div className={styles.propsList}>
                  {editor.properties.map((p) => {
                    const err = propertyError(p, editor.properties);
                    return (
                      <div key={p.key} className={err ? `${styles.propRow} ${styles.propRowError}` : styles.propRow}>
                        <div className={styles.propRowGrid}>
                          <Input
                            value={p.name}
                            placeholder={t('plan.editor.name')}
                            onChange={(e) => updateProperty(p.key, { name: e.target.value })}
                          />
                          <SimpleCustomSelect
                            value={p.type}
                            onValueChange={(v) => updateProperty(p.key, { type: v as PlanPropertyType, enumValues: v === 'enum' ? p.enumValues ?? [] : undefined })}
                            options={PROPERTY_TYPES.map((typeName) => ({ value: typeName, label: typeName }))}
                          />
                          <Switch checked={p.required} onCheckedChange={(checked) => updateProperty(p.key, { required: checked })} />
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => removeProperty(p.key)}
                            aria-label={t('plan.editor.cancel')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {err && <div className={styles.fieldError}>{err}</div>}
                        {p.type === 'enum' && (
                          <div className={styles.enumRow}>
                            {(p.enumValues ?? []).map((value, index) => (
                              <span key={value} className={styles.enumChip}>
                                {value}
                                <button type="button" onClick={() => removeEnumValue(p.key, index)} aria-label={t('plan.editor.cancel')}>
                                  ×
                                </button>
                              </span>
                            ))}
                            <input
                              type="text"
                              className={styles.enumInput}
                              placeholder={t('plan.editor.addValue')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addEnumValue(p.key, e.currentTarget.value);
                                  e.currentTarget.value = '';
                                }
                              }}
                            />
                          </div>
                        )}
                        <Input
                          value={p.description ?? ''}
                          placeholder={t('plan.editor.description')}
                          onChange={(e) => updateProperty(p.key, { description: e.target.value })}
                        />
                      </div>
                    );
                  })}
                </div>
                <button type="button" className={styles.addPropertyLink} onClick={addProperty}>
                  {t('plan.editor.addProperty')}
                </button>
              </div>
            </div>

            <div className={styles.editorFooter}>
              <Button variant="outline" onClick={closeEditor}>
                {t('plan.editor.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={!isEditorValid(editor) || upsert.isPending}>
                {t('plan.editor.save')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={deprecateTarget !== null} onOpenChange={(open) => !open && setDeprecateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('plan.deprecateConfirm.title', { name: editor?.name ?? '' })}</DialogTitle>
            <DialogDescription>{t('plan.deprecateConfirm.body')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeprecateTarget(null)}>
              {t('plan.deprecateConfirm.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDeprecate}>
              {t('plan.deprecateConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TrackingShell>
  );
}
