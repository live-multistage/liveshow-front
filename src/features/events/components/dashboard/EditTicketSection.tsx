'use client';

import { useState } from 'react';
import { Lock, Pencil } from 'lucide-react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ticketSchema, type TicketFormValues } from '../../schemas/create-event.schema';
import {
  useCreateTicketProductMutation,
  useDeleteTicketProductMutation,
  useUpdateTicketProductMutation,
} from '../../mutations/ticket-product.mutation';
import type { AccessCapability, TicketProductResponse } from '../../types/event.types';
import { useEventStagesQuery } from '../../../streams/queries/streams.queries';
import styles from './TicketSection.module.scss';

interface Props {
  eventId: string;
  tickets: TicketProductResponse[];
}

function capabilitiesLabel(caps: AccessCapability[], camerasLimit: number | null): string {
  const parts: string[] = [];
  if (caps.includes('LIVE_VIEW')) parts.push('Ao Vivo');
  if (caps.includes('REPLAY_VIEW')) parts.push('Replay');
  if (caps.includes('CAMERA_VIEW')) {
    parts.push(camerasLimit != null ? `${camerasLimit} câmera${camerasLimit !== 1 ? 's' : ''}` : 'Todas as câmeras');
  }
  return parts.join(' + ') || 'Sem acesso';
}

function ticketToForm(t: TicketProductResponse): TicketFormValues {
  return {
    name: t.name,
    description: t.description,
    price: t.price,
    liveView: t.capabilities.includes('LIVE_VIEW'),
    replayView: t.capabilities.includes('REPLAY_VIEW'),
    cameraView: t.capabilities.includes('CAMERA_VIEW'),
    camerasLimit: t.camerasLimit ?? undefined,
    allowedStageIds: t.allowedStageIds ?? [],
  };
}

const EMPTY_FORM: Partial<TicketFormValues> = {
  liveView: false,
  replayView: false,
  cameraView: false,
  camerasLimit: undefined,
  allowedStageIds: [],
};

export function EditTicketSection({ eventId, tickets }: Props) {
  const createMutation = useCreateTicketProductMutation(eventId);
  const updateMutation = useUpdateTicketProductMutation(eventId);
  const deleteMutation = useDeleteTicketProductMutation(eventId);
  const { stages } = useEventStagesQuery(eventId);

  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: EMPTY_FORM,
  });

  const cameraView = useWatch({ control, name: 'cameraView' });
  const liveView = useWatch({ control, name: 'liveView' });
  const showStageSelector = (liveView || cameraView) && stages.length > 0;

  const isEditing = editingId !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const startEdit = (ticket: TicketProductResponse) => {
    setEditingId(ticket.id);
    reset(ticketToForm(ticket));
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset(EMPTY_FORM);
  };

  const onSubmit = (values: TicketFormValues) => {
    const capabilities: AccessCapability[] = [];
    if (values.liveView) capabilities.push('LIVE_VIEW');
    if (values.replayView) capabilities.push('REPLAY_VIEW');
    if (values.cameraView) capabilities.push('CAMERA_VIEW');

    const payload = {
      name: values.name,
      description: values.description,
      price: values.price,
      capabilities,
      camerasLimit: values.cameraView ? (values.camerasLimit ?? null) : null,
      allowedStageIds: values.allowedStageIds?.length ? values.allowedStageIds : undefined,
    };

    if (editingId) {
      updateMutation.mutate(
        { ticketId: editingId, payload },
        { onSuccess: () => cancelEdit() },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => reset(EMPTY_FORM) });
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.dot} />
          Ingressos
        </h3>
        <div className={styles.headerActions}>
          {isEditing && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={cancelEdit}
              disabled={isPending}
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
          >
            {isEditing
              ? updateMutation.isPending
                ? 'Salvando…'
                : 'Salvar'
              : createMutation.isPending
                ? 'Adicionando…'
                : 'Adicionar'}
          </button>
        </div>
      </div>

      {/* Add form */}
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>Nome do Ingresso *</label>
          <input
            {...register('name')}
            className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
            placeholder="Ex: Ingresso Padrão"
          />
          {errors.name && <p className={styles.error}>{errors.name.message}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Preço (R$) *</label>
          <input
            type="number"
            step="0.01"
            min={0}
            {...register('price')}
            className={`${styles.input} ${errors.price ? styles.inputError : ''}`}
            placeholder="0,00"
          />
          {errors.price && <p className={styles.error}>{errors.price.message}</p>}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Descrição do Ingresso *</label>
        <input
          {...register('description')}
          className={`${styles.input} ${errors.description ? styles.inputError : ''}`}
          placeholder="Ex: Acesso ao show ao vivo"
        />
        {errors.description && <p className={styles.error}>{errors.description.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Tipo de Acesso *</label>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" {...register('liveView')} className={styles.checkbox} />
            <span>Ao Vivo</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" {...register('replayView')} className={styles.checkbox} />
            <span>Replay</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" {...register('cameraView')} className={styles.checkbox} />
            <span>Câmeras</span>
          </label>
        </div>
        {errors.liveView && <p className={styles.error}>{errors.liveView.message}</p>}
      </div>

      {cameraView && (
        <div className={styles.field}>
          <label className={styles.label}>Limite de Câmeras</label>
          <input
            type="number"
            min={1}
            step={1}
            {...register('camerasLimit')}
            className={`${styles.input} ${errors.camerasLimit ? styles.inputError : ''}`}
            placeholder="Vazio = acesso a todas"
          />
          <p className={styles.inputHint}>
            Deixe em branco para liberar todas as câmeras. Informe um número para limitar pelo índice de prioridade.
          </p>
          {errors.camerasLimit && <p className={styles.error}>{errors.camerasLimit.message}</p>}
        </div>
      )}

      {showStageSelector && (
        <div className={styles.field}>
          <label className={styles.label}>Palcos com Acesso</label>
          <Controller
            control={control}
            name="allowedStageIds"
            render={({ field }) => (
              <div className={styles.checkboxGroup}>
                {stages.map((stage) => {
                  const checked = (field.value ?? []).includes(stage.id);
                  return (
                    <label key={stage.id} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={checked}
                        onChange={(e) => {
                          const current = field.value ?? [];
                          field.onChange(
                            e.target.checked
                              ? [...current, stage.id]
                              : current.filter((id) => id !== stage.id),
                          );
                        }}
                      />
                      <span>{stage.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          />
          <p className={styles.inputHint}>
            Sem seleção = acesso a todos os palcos.
          </p>
        </div>
      )}

      {createMutation.isError && (
        <p className={styles.error}>{createMutation.error?.message ?? 'Erro ao adicionar ingresso.'}</p>
      )}
      {updateMutation.isError && (
        <p className={styles.error}>{updateMutation.error?.message ?? 'Erro ao salvar ingresso.'}</p>
      )}

      {/* Existing tickets */}
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className={`${styles.ticketCard} ${editingId === ticket.id ? styles.ticketCardEditing : ''}`}
        >
          <div className={styles.ticketCardTop}>
            <span className={styles.ticketCapLabel}>
              {capabilitiesLabel(ticket.capabilities, ticket.camerasLimit)}
            </span>
            {ticket.immutable ? (
              <Lock size={14} color="var(--text-muted, #666)" />
            ) : (
              <div className={styles.ticketCardActions}>
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={() => startEdit(ticket)}
                  disabled={isPending}
                  aria-label="Editar ingresso"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => deleteMutation.mutate(ticket.id)}
                  disabled={deleteMutation.isPending || editingId === ticket.id}
                  aria-label="Remover ingresso"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          <p className={styles.ticketName}>{ticket.name}</p>
          <p className={styles.ticketDesc}>{ticket.description}</p>
          <p className={styles.ticketPrice}>
            R$ {ticket.price.toFixed(2).replace('.', ',')}
          </p>
        </div>
      ))}

      {tickets.length === 0 && (
        <p className={styles.emptyHint}>Nenhum ingresso adicionado ainda.</p>
      )}
    </div>
  );
}
