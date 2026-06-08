'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ticketSchema, type TicketFormValues } from '../../schemas/create-event.schema';
import type { CreateTicketRequest } from '../../types/event.types';
import styles from './TicketSection.module.scss';

interface AddedTicket extends CreateTicketRequest {
  _key: string;
}

interface Props {
  tickets: AddedTicket[];
  onChange: (tickets: AddedTicket[]) => void;
}

function capabilitiesLabel(caps: string[]): string {
  if (caps.includes('LIVE_VIEW') && caps.includes('REPLAY_VIEW')) return 'Ao Vivo + Replay';
  if (caps.includes('LIVE_VIEW')) return 'Ao Vivo';
  return 'Replay';
}

export function TicketSection({ tickets, onChange }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { liveView: false, replayView: false },
  });

  const onAdd = (values: TicketFormValues) => {
    const capabilities: ('LIVE_VIEW' | 'REPLAY_VIEW')[] = [];
    if (values.liveView) capabilities.push('LIVE_VIEW');
    if (values.replayView) capabilities.push('REPLAY_VIEW');

    const ticket: AddedTicket = {
      _key: crypto.randomUUID(),
      name: values.name,
      description: values.description,
      price: values.price,
      capabilities,
    };

    onChange([...tickets, ticket]);
    reset();
  };

  const onRemove = (key: string) => {
    onChange(tickets.filter((t) => t._key !== key));
  };

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.dot} />
          Ingresso
        </h3>
        <button type="button" className={styles.addBtn} onClick={handleSubmit(onAdd)}>
          Adicionar
        </button>
      </div>

      {/* Form fields */}
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
        </div>
        {errors.liveView && <p className={styles.error}>{errors.liveView.message}</p>}
      </div>

      {/* Ticket cards */}
      {tickets.map((ticket) => (
        <div key={ticket._key} className={styles.ticketCard}>
          <div className={styles.ticketCardTop}>
            <span className={styles.ticketCapLabel}>
              Tipo de Acesso: {capabilitiesLabel(ticket.capabilities)}
            </span>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => onRemove(ticket._key)}
              aria-label="Remover ingresso"
            >
              ×
            </button>
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

export type { AddedTicket };
