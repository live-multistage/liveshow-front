'use client';

import { Lock } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ticketSchema, type TicketFormValues } from '../../schemas/create-event.schema';
import { useCreateTicketProductMutation, useDeleteTicketProductMutation } from '../../mutations/ticket-product.mutation';
import type { AccessCapability, TicketProductResponse } from '../../types/event.types';
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

export function EditTicketSection({ eventId, tickets }: Props) {
  const createMutation = useCreateTicketProductMutation(eventId);
  const deleteMutation = useDeleteTicketProductMutation(eventId);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { liveView: false, replayView: false, cameraView: false, camerasLimit: undefined },
  });

  const cameraView = useWatch({ control, name: 'cameraView' });

  const onAdd = (values: TicketFormValues) => {
    const capabilities: AccessCapability[] = [];
    if (values.liveView) capabilities.push('LIVE_VIEW');
    if (values.replayView) capabilities.push('REPLAY_VIEW');
    if (values.cameraView) capabilities.push('CAMERA_VIEW');

    createMutation.mutate(
      {
        name: values.name,
        description: values.description,
        price: values.price,
        capabilities,
        camerasLimit: values.cameraView ? (values.camerasLimit ?? null) : null,
      },
      { onSuccess: () => reset() },
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.dot} />
          Ingressos
        </h3>
        <button
          type="button"
          className={styles.addBtn}
          onClick={handleSubmit(onAdd)}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Adicionando…' : 'Adicionar'}
        </button>
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

      {createMutation.isError && (
        <p className={styles.error}>{createMutation.error?.message ?? 'Erro ao adicionar ingresso.'}</p>
      )}

      {/* Existing tickets */}
      {tickets.map((ticket) => (
        <div key={ticket.id} className={styles.ticketCard}>
          <div className={styles.ticketCardTop}>
            <span className={styles.ticketCapLabel}>
              {capabilitiesLabel(ticket.capabilities, ticket.camerasLimit)}
            </span>
            {ticket.immutable ? (
              <Lock size={14} color="var(--text-muted, #666)" />
            ) : (
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => deleteMutation.mutate(ticket.id)}
                disabled={deleteMutation.isPending}
                aria-label="Remover ingresso"
              >
                ×
              </button>
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
