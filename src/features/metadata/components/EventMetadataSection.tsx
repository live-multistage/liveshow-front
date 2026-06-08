'use client';

import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useEventMetadataQuery } from '../queries/use-event-metadata';
import { useAddMetadataMutation } from '../mutations/add-metadata.mutation';
import { useUpdateMetadataMutation } from '../mutations/update-metadata.mutation';
import { useDeleteMetadataMutation } from '../mutations/delete-metadata.mutation';
import type { MetadataResponse, MetadataValueType } from '../types/metadata.types';
import styles from './EventMetadataSection.module.scss';

const VALUE_TYPES: MetadataValueType[] = ['STRING', 'NUMBER', 'BOOLEAN', 'JSON'];

interface AddFormState {
  key: string;
  value: string;
  valueType: MetadataValueType;
}

interface EditState {
  id: string;
  value: string;
  valueType: MetadataValueType;
}

function AddForm({
  isPending,
  error,
  onSave,
  onCancel,
}: {
  isPending: boolean;
  error?: string;
  onSave: (s: AddFormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<AddFormState>({ key: '', value: '', valueType: 'STRING' });

  function set(field: keyof AddFormState, val: string) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  return (
    <div className={styles.form}>
      <div className={styles.formRow}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Key</label>
          <input
            className={styles.formInput}
            placeholder="ex: ticket_limit"
            value={form.key}
            onChange={(e) => set('key', e.target.value)}
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Value</label>
          <input
            className={styles.formInput}
            placeholder="ex: 500"
            value={form.value}
            onChange={(e) => set('value', e.target.value)}
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Type</label>
          <select
            className={styles.formSelect}
            value={form.valueType}
            onChange={(e) => set('valueType', e.target.value as MetadataValueType)}
          >
            {VALUE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formActions}>
        <button className={styles.btnCancel} onClick={onCancel} disabled={isPending}>
          Cancelar
        </button>
        <button
          className={styles.btnSave}
          disabled={isPending || !form.key.trim() || !form.value.trim()}
          onClick={() => onSave(form)}
        >
          {isPending ? 'Salvando…' : 'Adicionar'}
        </button>
      </div>
    </div>
  );
}

function EditForm({
  entry,
  isPending,
  error,
  onSave,
  onCancel,
}: {
  entry: MetadataResponse;
  isPending: boolean;
  error?: string;
  onSave: (s: EditState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EditState>({
    id: entry.id,
    value: entry.value,
    valueType: entry.valueType,
  });

  function set(field: keyof Omit<EditState, 'id'>, val: string) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  return (
    <div className={styles.form}>
      <div className={styles.formRow}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Key (read-only)</label>
          <input className={styles.formInput} value={entry.key} disabled />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Value</label>
          <input
            className={styles.formInput}
            value={form.value}
            onChange={(e) => set('value', e.target.value)}
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Type</label>
          <select
            className={styles.formSelect}
            value={form.valueType}
            onChange={(e) => set('valueType', e.target.value as MetadataValueType)}
          >
            {VALUE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formActions}>
        <button className={styles.btnCancel} onClick={onCancel} disabled={isPending}>
          Cancelar
        </button>
        <button
          className={styles.btnSave}
          disabled={isPending || !form.value.trim()}
          onClick={() => onSave(form)}
        >
          {isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}

interface Props {
  eventId: string;
}

export function EventMetadataSection({ eventId }: Props) {
  const { data: entries = [], isLoading } = useEventMetadataQuery(eventId);
  const addMutation = useAddMetadataMutation(eventId);
  const updateMutation = useUpdateMetadataMutation(eventId);
  const deleteMutation = useDeleteMetadataMutation(eventId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleAdd(form: AddFormState) {
    addMutation.mutate(form, {
      onSuccess: () => setShowAddForm(false),
    });
  }

  function handleUpdate(state: EditState) {
    updateMutation.mutate(
      { id: state.id, payload: { value: state.value, valueType: state.valueType } },
      { onSuccess: () => setEditingId(null) },
    );
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>Metadata</h2>
        {!showAddForm && (
          <button className={styles.btnAdd} onClick={() => setShowAddForm(true)}>
            <Plus size={12} /> Adicionar
          </button>
        )}
      </div>

      {showAddForm && (
        <AddForm
          isPending={addMutation.isPending}
          error={addMutation.error?.message}
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {isLoading ? (
        <p className={styles.empty}>Carregando…</p>
      ) : entries.length === 0 && !showAddForm ? (
        <p className={styles.empty}>Nenhum metadado configurado.</p>
      ) : entries.length > 0 ? (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Key</th>
              <th className={styles.th}>Value</th>
              <th className={styles.th}>Type</th>
              <th className={styles.th} />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) =>
              editingId === entry.id ? (
                <tr key={entry.id}>
                  <td className={styles.td} colSpan={4}>
                    <EditForm
                      entry={entry}
                      isPending={updateMutation.isPending}
                      error={updateMutation.error?.message}
                      onSave={handleUpdate}
                      onCancel={() => setEditingId(null)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={entry.id} className={styles.tr}>
                  <td className={`${styles.td} ${styles.key}`}>{entry.key}</td>
                  <td className={styles.td}>{entry.value}</td>
                  <td className={styles.td}>
                    <span className={styles.valueBadge}>{entry.valueType}</span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.actions}>
                      <button
                        className={styles.iconBtn}
                        onClick={() => setEditingId(entry.id)}
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.danger}`}
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleteMutation.isPending}
                        title="Remover"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
