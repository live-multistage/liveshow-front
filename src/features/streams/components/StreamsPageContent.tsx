'use client';

import { useState } from 'react';
import { Plus, Radio } from 'lucide-react';
import { useMyEventsQuery } from '@/features/events/queries/get-my-events';
import { useEventStreamsQuery } from '../queries/streams.queries';
import { useCreateStreamMutation } from '../mutations/stream.mutations';
import { StreamCard } from './StreamCard';
import { StreamBuilder } from './StreamBuilder';
import { SimpleCustomSelect } from '@/shared/components/ui/custom-select';
import type { StreamResponse } from '../types/stream.types';
import styles from './StreamsPageContent.module.scss';

// ── Create stream inline form ─────────────────────────────────────
interface CreateFormProps {
  eventId: string;
  onSuccess: (s: StreamResponse) => void;
  onCancel: () => void;
}

function CreateStreamForm({ eventId, onSuccess, onCancel }: CreateFormProps) {
  const [title, setTitle] = useState('');
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
  const [selectedStream, setSelectedStream] = useState<StreamResponse | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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
    if (selectedStream?.id === updated.id) {
      setSelectedStream(updated);
    }
  };

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <h1 className={styles.heading}>Streams</h1>
        <div className={styles.eventSelector}>
          <span className={styles.eventLabel}>Evento:</span>
          <SimpleCustomSelect
            value={selectedEventId ?? ''}
            onValueChange={handleEventChange}
            placeholder="Selecionar evento..."
            disabled={eventsLoading}
            options={events.map((e) => ({ value: e.id, label: e.title }))}
          />
        </div>
      </div>

      {/* Split layout */}
      <div className={styles.split}>
        {/* Left: stream list */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>
              Streams {activeEvent ? `· ${streams.length}` : ''}
            </span>
            {selectedEventId && !showCreate && (
              <button
                className={styles.btnCreate}
                onClick={() => setShowCreate(true)}
              >
                <Plus size={12} /> Nova
              </button>
            )}
          </div>

          {/* Inline create form */}
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
              <p className={styles.loadingText}>Carregando streams...</p>
            )}
            {selectedEventId && !streamsLoading && streams.length === 0 && (
              <p className={styles.emptyList}>
                Nenhuma stream criada.<br />
                Clique em <strong>+ Nova</strong> para começar.
              </p>
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
        </div>

        {/* Right: builder */}
        <div className={styles.content}>
          {selectedStream ? (
            <StreamBuilder
              stream={selectedStream}
              eventId={selectedEventId!}
              onStreamUpdated={handleStreamUpdated}
              onStreamDeleted={() => setSelectedStream(null)}
            />
          ) : (
            <div className={styles.placeholder}>
              <Radio size={48} className={styles.placeholderIcon} />
              <p className={styles.placeholderText}>
                {!selectedEventId
                  ? 'Selecione um evento para gerenciar streams.'
                  : 'Selecione uma stream para configurar palcos, feeds e câmeras.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
