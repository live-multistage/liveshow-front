'use client';

import { useState, useRef, useCallback } from 'react';
import { ChevronRight, Layers, Trash2, Radio } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './EventStreamStep.module.scss';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CameraConfig { _key: string; name: string; priority: number; }
export interface FeedConfig    { _key: string; name: string; cameras: CameraConfig[]; }
export interface StageConfig   { _key: string; name: string; feeds: FeedConfig[]; }
export interface StreamConfig  { title: string; stages: StageConfig[]; }

export const emptyStreamConfig = (): StreamConfig => ({ title: '', stages: [] });

interface Props {
  value: StreamConfig;
  onChange: (v: StreamConfig) => void;
}

// ── Key factory ──────────────────────────────────────────────────────────────

let _seq = 0;
const mk = () => `${Date.now()}_${++_seq}`;

// ── Inline add widget ─────────────────────────────────────────────────────────

interface AddInlineProps {
  placeholder: string;
  buttonLabel: string;
  onAdd: (name: string) => void;
}

function AddInline({ placeholder, buttonLabel, onAdd }: AddInlineProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName('');
    inputRef.current?.focus();
  }

  return (
    <div className={styles.addRow}>
      <input
        ref={inputRef}
        className={styles.addInput}
        placeholder={placeholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit())}
      />
      <button type="button" className={styles.btnAdd} onClick={commit}>
        + {buttonLabel}
      </button>
    </div>
  );
}

// ── Camera row ────────────────────────────────────────────────────────────────

interface CameraRowProps {
  camera: CameraConfig;
  onRemove: () => void;
}

function CameraRow({ camera, onRemove }: CameraRowProps) {
  const t = useTranslations('createEvent.stream');

  return (
    <div className={styles.camera}>
      <span className={styles.cameraDot} />
      <span className={styles.cameraName}>{camera.name}</span>
      <span className={styles.cameraPriority}>P:{camera.priority}</span>
      <button type="button" className={styles.iconBtn} onClick={onRemove} title={t('removeCamera')}>
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ── Feed node ─────────────────────────────────────────────────────────────────

interface FeedNodeProps {
  feed: FeedConfig;
  onRemove: () => void;
  onAddCamera: (name: string) => void;
  onRemoveCamera: (key: string) => void;
}

function FeedNode({ feed, onRemove, onAddCamera, onRemoveCamera }: FeedNodeProps) {
  const [open, setOpen] = useState(true);
  const t = useTranslations('createEvent.stream');

  return (
    <div className={styles.feed}>
      <div className={styles.feedHeader} onClick={() => setOpen((o) => !o)}>
        <ChevronRight size={12} className={`${styles.chevron} ${open ? styles.open : ''}`} />
        <span className={styles.feedName}>
          <Layers size={10} style={{ opacity: 0.6 }} />
          {feed.name}
        </span>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title={t('removeFeed')}
        >
          <Trash2 size={11} />
        </button>
      </div>

      {open && (
        <div className={styles.feedBody}>
          {feed.cameras.map((cam) => (
            <CameraRow
              key={cam._key}
              camera={cam}
              onRemove={() => onRemoveCamera(cam._key)}
            />
          ))}
          <AddInline
            placeholder={t('cameraPlaceholder')}
            buttonLabel={t('addCamera')}
            onAdd={onAddCamera}
          />
        </div>
      )}
    </div>
  );
}

// ── Stage node ────────────────────────────────────────────────────────────────

interface StageNodeProps {
  stage: StageConfig;
  onRemove: () => void;
  onAddFeed: (name: string) => void;
  onRemoveFeed: (key: string) => void;
  onAddCamera: (feedKey: string, name: string) => void;
  onRemoveCamera: (feedKey: string, camKey: string) => void;
}

function StageNode({
  stage,
  onRemove,
  onAddFeed,
  onRemoveFeed,
  onAddCamera,
  onRemoveCamera,
}: StageNodeProps) {
  const [open, setOpen] = useState(true);
  const t = useTranslations('createEvent.stream');

  return (
    <div className={styles.stage}>
      <div className={styles.stageHeader} onClick={() => setOpen((o) => !o)}>
        <ChevronRight size={13} className={`${styles.chevron} ${open ? styles.open : ''}`} />
        <p className={styles.stageName}>{stage.name}</p>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          title={t('removeStage')}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {open && (
        <div className={styles.stageBody}>
          {stage.feeds?.map((feed) => (
            <FeedNode
              key={feed._key}
              feed={feed}
              onRemove={() => onRemoveFeed(feed._key)}
              onAddCamera={(name) => onAddCamera(feed._key, name)}
              onRemoveCamera={(camKey) => onRemoveCamera(feed._key, camKey)}
            />
          ))}
          <AddInline
            placeholder={t('feedPlaceholder')}
            buttonLabel={t('addFeed')}
            onAdd={onAddFeed}
          />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function EventStreamStep({ value, onChange }: Props) {
  const t = useTranslations('createEvent.stream');

  const setTitle = useCallback(
    (title: string) => onChange({ ...value, title }),
    [value, onChange],
  );

  const addStage = useCallback(
    (name: string) =>
      onChange({ ...value, stages: [...value.stages, { _key: mk(), name, feeds: [] }] }),
    [value, onChange],
  );

  const removeStage = useCallback(
    (key: string) =>
      onChange({ ...value, stages: value.stages.filter((s) => s._key !== key) }),
    [value, onChange],
  );

  const addFeed = useCallback(
    (stageKey: string, name: string) =>
      onChange({
        ...value,
        stages: value.stages.map((s) =>
          s._key === stageKey
            ? { ...s, feeds: [...s.feeds, { _key: mk(), name, cameras: [] }] }
            : s,
        ),
      }),
    [value, onChange],
  );

  const removeFeed = useCallback(
    (stageKey: string, feedKey: string) =>
      onChange({
        ...value,
        stages: value.stages.map((s) =>
          s._key === stageKey
            ? { ...s, feeds: s.feeds.filter((f) => f._key !== feedKey) }
            : s,
        ),
      }),
    [value, onChange],
  );

  const addCamera = useCallback(
    (stageKey: string, feedKey: string, name: string) => {
      onChange({
        ...value,
        stages: value.stages.map((s) =>
          s._key !== stageKey
            ? s
            : {
                ...s,
                feeds: s.feeds?.map((f) =>
                  f._key !== feedKey
                    ? f
                    : {
                        ...f,
                        cameras: [
                          ...f.cameras,
                          { _key: mk(), name, priority: f.cameras.length + 1 },
                        ],
                      },
                ),
              },
        ),
      });
    },
    [value, onChange],
  );

  const removeCamera = useCallback(
    (stageKey: string, feedKey: string, camKey: string) =>
      onChange({
        ...value,
        stages: value.stages.map((s) =>
          s._key !== stageKey
            ? s
            : {
                ...s,
                feeds: s.feeds?.map((f) =>
                  f._key !== feedKey
                    ? f
                    : { ...f, cameras: f.cameras.filter((c) => c._key !== camKey) },
                ),
              },
        ),
      }),
    [value, onChange],
  );

  return (
    <section className={styles.section}>
      <p className={styles.hint}>{t('hint')}</p>

      <div className={styles.titleRow}>
        <label className={styles.label}>{t('titleLabel')}</label>
        <input
          className={styles.titleInput}
          placeholder={t('titlePlaceholder')}
          value={value.title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className={styles.tree}>
        <span className={styles.treeLabel}>
          <Radio size={10} />
          {t('stagesLabel')}
        </span>

        {value.stages.map((stage) => (
          <StageNode
            key={stage._key}
            stage={stage}
            onRemove={() => removeStage(stage._key)}
            onAddFeed={(name) => addFeed(stage._key, name)}
            onRemoveFeed={(feedKey) => removeFeed(stage._key, feedKey)}
            onAddCamera={(feedKey, name) => addCamera(stage._key, feedKey, name)}
            onRemoveCamera={(feedKey, camKey) => removeCamera(stage._key, feedKey, camKey)}
          />
        ))}

        <AddInline
          placeholder={t('stagePlaceholder')}
          buttonLabel={t('addStage')}
          onAdd={addStage}
        />
      </div>
    </section>
  );
}
