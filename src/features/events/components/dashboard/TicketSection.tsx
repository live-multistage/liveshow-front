'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ticketSchema, type TicketFormInput, type TicketFormValues } from '../../schemas/create-event.schema';
import type { CreateTicketRequest, AccessCapability } from '../../types/event.types';
import styles from './TicketSection.module.scss';

interface AddedTicket extends CreateTicketRequest {
  _key: string;
}

interface Props {
  tickets: AddedTicket[];
  onChange: (tickets: AddedTicket[]) => void;
}

export function TicketSection({ tickets, onChange }: Props) {
  const t = useTranslations('editTicket');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TicketFormInput, unknown, TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { liveView: false, replayView: false, cameraView: false, camerasLimit: undefined },
  });

  const cameraView = useWatch({ control, name: 'cameraView' });

  // Replay-only suggestion card. Its price lives in local state, NOT the draft
  // form, so creating the suggested ticket never disturbs the ticket the user
  // is composing. Hides once the list already has a replay-only ticket.
  const [replayPrice, setReplayPrice] = useState('');
  const hasReplayOnly = tickets.some(
    (t) => t.capabilities.includes('REPLAY_VIEW') && !t.capabilities.includes('LIVE_VIEW'),
  );
  const replayPriceNum = Number(replayPrice.replace(',', '.'));
  const replayPriceValid = replayPrice.trim() !== '' && Number.isFinite(replayPriceNum) && replayPriceNum >= 0;

  const onCreateReplay = () => {
    if (!replayPriceValid) return;
    onChange([
      ...tickets,
      {
        _key: crypto.randomUUID(),
        name: 'Reprise',
        description: 'Acesso à gravação após o evento',
        price: replayPriceNum,
        capabilities: ['REPLAY_VIEW'],
        camerasLimit: null,
      },
    ]);
    setReplayPrice('');
  };

  function capabilitiesLabel(caps: AccessCapability[], camerasLimit: number | null | undefined): string {
    const parts: string[] = [];
    if (caps.includes('LIVE_VIEW')) parts.push(t('liveView'));
    if (caps.includes('REPLAY_VIEW')) parts.push(t('replayView'));
    if (caps.includes('CAMERA_VIEW')) {
      parts.push(camerasLimit != null ? t('cameras', { count: camerasLimit }) : t('allCameras'));
    }
    return parts.join(' + ');
  }

  const onAdd = (values: TicketFormValues) => {
    const capabilities: AccessCapability[] = [];
    if (values.liveView) capabilities.push('LIVE_VIEW');
    if (values.replayView) capabilities.push('REPLAY_VIEW');
    if (values.cameraView) capabilities.push('CAMERA_VIEW');

    const ticket: AddedTicket = {
      _key: crypto.randomUUID(),
      name: values.name,
      description: values.description,
      price: values.price,
      capabilities,
      camerasLimit: values.cameraView ? (values.camerasLimit ?? null) : null,
    };

    onChange([...tickets, ticket]);
    reset();
  };

  const onRemove = (key: string) => {
    onChange(tickets.filter((ticket) => ticket._key !== key));
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.dot} />
          {t('title')}
        </h3>
        <button type="button" className={styles.addBtn} onClick={handleSubmit(onAdd)}>
          {t('add')}
        </button>
      </div>

      {!hasReplayOnly && (
        <div className={styles.replayNudge}>
          <div className={styles.replayNudgeIcon}>
            <Sparkles size={16} />
          </div>
          <div className={styles.replayNudgeBody}>
            <p className={styles.replayNudgeTitle}>Recomendado: ingresso “Somente reprise”</p>
            <p className={styles.replayNudgeText}>
              Dá acesso só à gravação — continua vendendo depois que o evento passa da data.
            </p>
          </div>
          <div className={styles.replayNudgeAction}>
            <div className={styles.replayNudgePriceWrap}>
              <span className={styles.replayNudgeCurrency}>R$</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={replayPrice}
                onChange={(e) => setReplayPrice(e.target.value)}
                placeholder="0,00"
                className={styles.replayNudgeInput}
                aria-label="Preço do ingresso somente reprise"
              />
            </div>
            <button
              type="button"
              className={styles.replayNudgeBtn}
              onClick={onCreateReplay}
              disabled={!replayPriceValid}
            >
              Criar
            </button>
          </div>
        </div>
      )}

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>{t('nameLabel')}</label>
          <input
            {...register('name')}
            className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
            placeholder={t('namePlaceholder')}
          />
          {errors.name && <p className={styles.error}>{errors.name.message}</p>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t('priceLabel')}</label>
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
        <label className={styles.label}>{t('descLabel')}</label>
        <input
          {...register('description')}
          className={`${styles.input} ${errors.description ? styles.inputError : ''}`}
          placeholder={t('descPlaceholder')}
        />
        {errors.description && <p className={styles.error}>{errors.description.message}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>{t('accessLabel')}</label>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" {...register('liveView')} className={styles.checkbox} />
            <span>{t('liveView')}</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" {...register('replayView')} className={styles.checkbox} />
            <span>{t('replayView')}</span>
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" {...register('cameraView')} className={styles.checkbox} />
            <span>{t('cameraView')}</span>
          </label>
        </div>
        {errors.liveView && <p className={styles.error}>{errors.liveView.message}</p>}
      </div>

      {cameraView && (
        <div className={styles.field}>
          <label className={styles.label}>{t('camerasLimitLabel')}</label>
          <input
            type="number"
            min={1}
            step={1}
            {...register('camerasLimit')}
            className={`${styles.input} ${errors.camerasLimit ? styles.inputError : ''}`}
            placeholder={t('camerasLimitPlaceholder')}
          />
          <p className={styles.inputHint}>{t('camerasLimitHint')}</p>
          {errors.camerasLimit && <p className={styles.error}>{errors.camerasLimit.message}</p>}
        </div>
      )}

      {tickets.map((ticket) => (
        <div key={ticket._key} className={styles.ticketCard}>
          <div className={styles.ticketCardTop}>
            <span className={styles.ticketCapLabel}>
              {capabilitiesLabel(ticket.capabilities, ticket.camerasLimit)}
            </span>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => onRemove(ticket._key)}
              aria-label="×"
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
        <p className={styles.emptyHint}>{t('empty')}</p>
      )}

      <p className={styles.inputHint}>{t('stagesNote')}</p>
    </div>
  );
}

export type { AddedTicket };
