'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ticketSchema, type TicketFormInput, type TicketFormValues } from '../../schemas/create-event.schema';
import type { CreateTicketRequest, AccessCapability, EventFormat } from '../../types/event.types';
import { ISO_CURRENCIES, DEFAULT_CURRENCY } from '@/shared/constants/currencies';
import { formatPrice } from '../../utils/event-formatters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@live-show/design-system';
import styles from './TicketSection.module.scss';

interface AddedTicket extends CreateTicketRequest {
  _key: string;
}

interface Props {
  tickets: AddedTicket[];
  onChange: (tickets: AddedTicket[]) => void;
  format?: EventFormat;
}

export function TicketSection({ tickets, onChange, format }: Props) {
  const t = useTranslations('editTicket');
  // VOD events can only sell replay access — the backend 400s any other
  // capability. Lock the form to REPLAY_VIEW instead of letting the user
  // hit that error after the event was already created.
  const isVod = format === 'VOD';

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TicketFormInput, unknown, TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      currency: DEFAULT_CURRENCY,
      liveView: false,
      replayView: isVod,
      cameraView: false,
      physicalEntry: false,
      camerasLimit: undefined,
    },
  });

  const cameraView = useWatch({ control, name: 'cameraView' });
  const physicalEntry = useWatch({ control, name: 'physicalEntry' });
  const liveView = useWatch({ control, name: 'liveView' });
  const replayView = useWatch({ control, name: 'replayView' });

  // Presencial nunca sozinho: sem Ao vivo/Reprise o checkbox trava, e se o
  // usuário desmarcar o stream com presencial já ligado, desliga junto.
  const canPhysical = liveView || replayView;
  useEffect(() => {
    if (!canPhysical && physicalEntry) setValue('physicalEntry', false);
  }, [canPhysical, physicalEntry, setValue]);

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
        description: t('replayTicketDesc'),
        price: replayPriceNum,
        currency: DEFAULT_CURRENCY,
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
    if (caps.includes('PHYSICAL_ENTRY')) parts.push('Presencial');
    return parts.join(' + ');
  }

  const onAdd = (values: TicketFormValues) => {
    const capabilities: AccessCapability[] = isVod
      ? ['REPLAY_VIEW']
      : [
        ...(values.liveView ? ['LIVE_VIEW' as const] : []),
        ...(values.replayView ? ['REPLAY_VIEW' as const] : []),
        ...(values.cameraView ? ['CAMERA_VIEW' as const] : []),
        ...(values.physicalEntry ? ['PHYSICAL_ENTRY' as const] : []),
      ];

    const ticket: AddedTicket = {
      _key: crypto.randomUUID(),
      name: values.name,
      description: values.description,
      price: values.price,
      currency: values.currency,
      capabilities,
      camerasLimit: !isVod && values.cameraView ? (values.camerasLimit ?? null) : null,
      capacity: !isVod && values.physicalEntry ? (values.capacity ?? null) : null,
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

      {!isVod && !hasReplayOnly && (
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

        <div className={styles.field}>
          <label className={styles.label}>{t('currencyLabel')}</label>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={styles.input}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ISO_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
        {isVod ? (
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel} title={t('vodHint')}>
              <input type="checkbox" checked disabled className={styles.checkbox} />
              <span>{t('replayView')}</span>
            </label>
          </div>
        ) : (
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
            <label
              className={styles.checkboxLabel}
              title={canPhysical ? undefined : 'Requer Ao vivo ou Reprise'}
            >
              <input
                type="checkbox"
                {...register('physicalEntry')}
                className={styles.checkbox}
                disabled={!canPhysical}
              />
              <span>Acesso presencial</span>
            </label>
          </div>
        )}
        {isVod && <p className={styles.inputHint}>{t('vodHint')}</p>}
        {errors.liveView && <p className={styles.error}>{errors.liveView.message}</p>}
        {errors.physicalEntry && <p className={styles.error}>{errors.physicalEntry.message}</p>}
      </div>

      {!isVod && cameraView && (
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

      {!isVod && physicalEntry && (
        <div className={styles.field}>
          <label className={styles.label}>Capacidade do local</label>
          <input
            type="number"
            min={1}
            step={1}
            {...register('capacity')}
            className={`${styles.input} ${errors.capacity ? styles.inputError : ''}`}
            placeholder="Ex: 500"
          />
          <p className={styles.inputHint}>Nº de lugares presenciais. Esgota quando vendidos.</p>
          {errors.capacity && <p className={styles.error}>{errors.capacity.message}</p>}
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
            {formatPrice(ticket.price, ticket.currency)}
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
