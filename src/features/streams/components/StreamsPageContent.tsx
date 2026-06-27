'use client';

import { useState, useEffect, useRef } from 'react';
import { useMyEventsQuery } from '@/features/events/queries/get-my-events';
import { useEventStreamsQuery } from '../queries/streams.queries';
import { useCreateStreamMutation } from '../mutations/stream.mutations';
import { StreamCard } from './StreamCard';
import { StreamBuilder } from './StreamBuilder';
import { StreamSetupTutorial } from './StreamSetupTutorial';
import { SimpleCustomSelect } from '@/shared/components/ui/custom-select';
import type { StreamResponse } from '../types/stream.types';
import styles from './StreamsPageContent.module.scss';

// ── Live timer ─────────────────────────────────────────────────────
function useLiveTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) { setSeconds(0); return; }
    ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [active]);

  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ── Stats strip ───────────────────────────────────────────────────
function StatsStrip({ stream }: { stream: StreamResponse }) {
  const isLive = stream.status === 'LIVE';
  const timer  = useLiveTimer(isLive);

  return (
    <div className={styles.statsStrip}>
      <div className={`${styles.statCard} ${isLive ? styles.statCardLive : ''}`}>
        {isLive && <div className={styles.statCardGlow} />}
        <div className={styles.statLabel}>
          <span className={isLive ? styles.liveDot : styles.offlineDot} />
          {isLive ? 'AO VIVO' : 'OFFLINE'}
        </div>
        <div className={styles.statValue}>{isLive ? timer : '—'}</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>ESPECTADORES</div>
        <div className={styles.statValue}>—</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>BITRATE</div>
        <div className={styles.statValue}>
          — <span className={styles.statUnit}>Mbps</span>
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>LATÊNCIA</div>
        <div className={styles.statValue}>
          —<span className={styles.statUnit}>s</span>
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statLabel}>SAÚDE</div>
        <div className={styles.statHealthRow}>
          <span className={styles.healthDot} />
          <span className={styles.statValue}>—</span>
        </div>
      </div>
    </div>
  );
}

// ── Create stream inline form ─────────────────────────────────────
interface CreateFormProps {
  eventId: string;
  onSuccess: (s: StreamResponse) => void;
  onCancel: () => void;
}

function CreateStreamForm({ eventId, onSuccess, onCancel }: CreateFormProps) {
  const [title, setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const mutation = useCreateStreamMutation(eventId, onSuccess);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutation.mutate({ title: title.trim(), description: description.trim() || undefined });
  };

  return (
    <div className={styles.createForm}>
      <p className={styles.createFormTitle}>Nova Stream</p>
      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Título *</label>
          <input
            className={styles.fieldInput}
            placeholder="ex: Transmissão Oficial"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Descrição</label>
          <textarea
            className={styles.fieldTextarea}
            placeholder="Descrição opcional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {mutation.isError && (
          <p className={styles.errorMsg}>{(mutation.error as Error)?.message ?? 'Erro ao criar'}</p>
        )}
        <div className={styles.formActions}>
          <button type="submit" className={styles.btnSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? 'Criando...' : 'Criar'}
          </button>
          <button type="button" className={styles.btnDismiss} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export function StreamsPageContent() {
  const { data: events = [], isLoading: eventsLoading } = useMyEventsQuery();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedStream, setSelectedStream]   = useState<StreamResponse | null>(null);
  const [showCreate, setShowCreate]           = useState(false);
  const [showTutorial, setShowTutorial]       = useState(false);

  const { data: streams = [], isLoading: streamsLoading } = useEventStreamsQuery(selectedEventId);

  const activeEvent = events.find((e) => e.id === selectedEventId);

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId || null);
    setSelectedStream(null);
    setShowCreate(false);
  };

  const handleStreamCreated = (stream: StreamResponse) => {
    setShowCreate(false);
    setSelectedStream(stream);
  };

  const handleStreamUpdated = (updated: StreamResponse) => {
    if (selectedStream?.id === updated.id) setSelectedStream(updated);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <div className={styles.breadcrumb}>SALA DE CONTROLE</div>
          <h1 className={styles.heading}>Streams</h1>
        </div>
        <div className={styles.eventSelectorWrap}>
          <span className={styles.eventLabel}>EVENTO</span>
          <div className={styles.eventSelectorBox}>
            {activeEvent && <span className={styles.eventDot} />}
            <SimpleCustomSelect
              value={selectedEventId ?? ''}
              onValueChange={handleEventChange}
              placeholder="Selecionar evento..."
              disabled={eventsLoading}
              options={events.map((e) => ({ value: e.id, label: e.title }))}
            />
          </div>
        </div>
      </div>

      {/* Stats strip — only when a stream is selected */}
      {selectedStream && <StatsStrip stream={selectedStream} />}

      {/* 2-col layout */}
      <div className={styles.layout}>

        {/* Left: stream list */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarTitle}>
              STREAMS
              <span className={styles.sidebarDot}>·</span>
              <span className={styles.sidebarCount}>{streams.length}</span>
            </div>
            {selectedEventId && !showCreate && (
              <button className={styles.btnNova} onClick={() => setShowCreate(true)}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                NOVA
              </button>
            )}
          </div>

          {showCreate && selectedEventId && (
            <CreateStreamForm
              eventId={selectedEventId}
              onSuccess={handleStreamCreated}
              onCancel={() => setShowCreate(false)}
            />
          )}

          <div className={styles.streamList}>
            {!selectedEventId && (
              <p className={styles.emptyList}>Selecione um evento para ver suas streams.</p>
            )}
            {selectedEventId && streamsLoading && (
              <p className={styles.emptyList}>Carregando streams...</p>
            )}
            {selectedEventId && !streamsLoading && streams.length === 0 && !showCreate && (
              <p className={styles.emptyList}>Nenhuma stream criada.</p>
            )}
            {streams.map((stream) => (
              <StreamCard
                key={stream.id}
                stream={stream}
                active={selectedStream?.id === stream.id}
                onClick={() => setSelectedStream(stream)}
              />
            ))}
          </div>

          {selectedEventId && (
            <button
              className={styles.btnNovaTransmissao}
              onClick={() => setShowCreate(true)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              NOVA TRANSMISSÃO
            </button>
          )}
        </div>

        {/* Right: workspace */}
        <div className={styles.workspace}>
          {selectedStream ? (
            <StreamBuilder
              stream={selectedStream}
              eventId={selectedEventId!}
              onStreamUpdated={handleStreamUpdated}
              onStreamDeleted={() => setSelectedStream(null)}
            />
          ) : (
            <div className={styles.placeholder}>
              <svg
                width="48" height="48" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.5"
                className={styles.placeholderIcon}
              >
                <circle cx="12" cy="12" r="2" />
                <path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4M9.2 9.2a4 4 0 0 0 0 5.6M14.8 9.2a4 4 0 0 1 0 5.6" />
              </svg>
              <p className={styles.placeholderText}>
                {!selectedEventId
                  ? 'Selecione um evento para gerenciar streams.'
                  : 'Selecione uma stream para configurar palcos, feeds e câmeras.'}
              </p>
              {selectedEventId && (
                <button className={styles.btnTutorial} onClick={() => setShowTutorial(true)}>
                  Como começar →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showTutorial && selectedEventId && (
        <StreamSetupTutorial
          eventId={selectedEventId}
          onClose={() => setShowTutorial(false)}
          onComplete={(stream) => {
            setShowTutorial(false);
            setSelectedStream(stream);
          }}
        />
      )}
    </div>
  );
}
