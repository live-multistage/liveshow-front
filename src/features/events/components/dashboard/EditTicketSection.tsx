'use client';

import { useEffect, useState } from 'react';
import { Lock, Pencil } from 'lucide-react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { ticketSchema, type TicketFormInput, type TicketFormValues } from '../../schemas/create-event.schema';
import {
  useCreateTicketProductMutation,
  useDeleteTicketProductMutation,
  useUpdateTicketProductMutation,
} from '../../mutations/ticket-product.mutation';
import {
  useCreateSeriesTicketProductMutation,
  useDeleteSeriesTicketProductMutation,
  useUpdateSeriesTicketProductMutation,
} from '../../../series/mutations/series.mutations';
import type { AccessCapability } from '../../types/event.types';
import { useEventStagesQuery } from '../../../streams/queries/streams.queries';
import { ISO_CURRENCIES, DEFAULT_CURRENCY } from '@/shared/constants/currencies';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@live-show/design-system';
import styles from './TicketSection.module.scss';

// Common shape both an event's TicketProductResponse and a series'
// SeriesTicketProduct satisfy — the form only ever reads/writes these fields,
// so it stays agnostic of which backend resource it's editing.
interface TicketProductLike {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  capabilities: AccessCapability[];
  camerasLimit: number | null;
  allowedStageIds: string[];
  capacity: number | null;
  immutable: boolean;
  remaining?: number | null;
  soldOut?: boolean;
}

interface Props {
  // Exactly one of eventId/seriesId is set — mirrors the backend's
  // TicketProduct invariant (either eventId or seriesId, never both).
  eventId?: string;
  seriesId?: string;
  // Stage checkboxes always come from an Event's streams. For a series
  // that's the template event, which differs from seriesId — defaults to
  // eventId when omitted.
  stagesEventId?: string;
  tickets: TicketProductLike[];
}

function ticketToForm(ticket: TicketProductLike): TicketFormValues {
  return {
    name: ticket.name,
    description: ticket.description,
    price: ticket.price,
    currency: ticket.currency ?? DEFAULT_CURRENCY,
    liveView: ticket.capabilities.includes('LIVE_VIEW'),
    replayView: ticket.capabilities.includes('REPLAY_VIEW'),
    cameraView: ticket.capabilities.includes('CAMERA_VIEW'),
    physicalEntry: ticket.capabilities.includes('PHYSICAL_ENTRY'),
    camerasLimit: ticket.camerasLimit ?? undefined,
    capacity: ticket.capacity ?? undefined,
    allowedStageIds: ticket.allowedStageIds ?? [],
  };
}

const EMPTY_FORM: Partial<TicketFormInput> = {
  currency: DEFAULT_CURRENCY,
  liveView: false,
  replayView: false,
  cameraView: false,
  physicalEntry: false,
  camerasLimit: undefined,
  capacity: undefined,
  allowedStageIds: [],
};

export function EditTicketSection({ eventId, seriesId, stagesEventId, tickets }: Props) {
  const t = useTranslations('editTicket');
  const isSeries = Boolean(seriesId);

  const createEventMutation = useCreateTicketProductMutation(eventId ?? '');
  const updateEventMutation = useUpdateTicketProductMutation(eventId ?? '');
  const deleteEventMutation = useDeleteTicketProductMutation(eventId ?? '');
  const createSeriesMutation = useCreateSeriesTicketProductMutation();
  const updateSeriesMutation = useUpdateSeriesTicketProductMutation();
  const deleteSeriesMutation = useDeleteSeriesTicketProductMutation();

  const createMutation = isSeries ? createSeriesMutation : createEventMutation;
  const updateMutation = isSeries ? updateSeriesMutation : updateEventMutation;
  const deleteMutation = isSeries ? deleteSeriesMutation : deleteEventMutation;

  const { stages } = useEventStagesQuery(stagesEventId ?? eventId ?? null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TicketFormInput, unknown, TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: EMPTY_FORM,
  });

  const cameraView = useWatch({ control, name: 'cameraView' });
  const liveView = useWatch({ control, name: 'liveView' });
  const replayView = useWatch({ control, name: 'replayView' });
  const physicalEntry = useWatch({ control, name: 'physicalEntry' });
  const showStageSelector = (liveView || cameraView) && stages.length > 0;

  // Presencial nunca sozinho: sem Ao vivo/Reprise o checkbox trava, e se o
  // usuário desmarcar o stream com presencial já ligado, desliga junto.
  const canPhysical = liveView || replayView;
  useEffect(() => {
    if (!canPhysical && physicalEntry) setValue('physicalEntry', false);
  }, [canPhysical, physicalEntry, setValue]);

  const isEditing = editingId !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  function capabilitiesLabel(caps: AccessCapability[], camerasLimit: number | null): string {
    const parts: string[] = [];
    if (caps.includes('LIVE_VIEW')) parts.push(t('liveView'));
    if (caps.includes('REPLAY_VIEW')) parts.push(t('replayView'));
    if (caps.includes('CAMERA_VIEW')) {
      parts.push(camerasLimit != null ? t('cameras', { count: camerasLimit }) : t('allCameras'));
    }
    if (caps.includes('PHYSICAL_ENTRY')) parts.push('Presencial');
    return parts.join(' + ');
  }

  const startEdit = (ticket: TicketProductLike) => {
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
    if (values.physicalEntry) capabilities.push('PHYSICAL_ENTRY');

    const payload = {
      name: values.name,
      description: values.description,
      price: values.price,
      currency: values.currency,
      capabilities,
      camerasLimit: values.cameraView ? (values.camerasLimit ?? null) : null,
      capacity: values.physicalEntry ? (values.capacity ?? null) : null,
      allowedStageIds: values.allowedStageIds?.length ? values.allowedStageIds : undefined,
    };

    if (editingId) {
      if (isSeries) {
        updateSeriesMutation.mutate(
          { seriesId: seriesId!, productId: editingId, input: payload },
          { onSuccess: () => cancelEdit() },
        );
      } else {
        updateEventMutation.mutate(
          { ticketId: editingId, payload },
          { onSuccess: () => cancelEdit() },
        );
      }
    } else if (isSeries) {
      createSeriesMutation.mutate(
        { seriesId: seriesId!, input: payload },
        { onSuccess: () => reset(EMPTY_FORM) },
      );
    } else {
      createEventMutation.mutate(payload, { onSuccess: () => reset(EMPTY_FORM) });
    }
  };


  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.dot} />
          {t('title')}
        </h3>
        <div className={styles.headerActions}>
          {isEditing && (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={cancelEdit}
              disabled={isPending}
            >
              {t('cancel')}
            </button>
          )}
          <button
            type="button"
            className={styles.addBtn}
            onClick={handleSubmit(onSubmit)}
            disabled={isPending}
          >
            {isEditing
              ? updateMutation.isPending ? t('saving') : t('save')
              : createMutation.isPending ? t('adding') : t('add')}
          </button>
        </div>
      </div>

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
        {errors.liveView && <p className={styles.error}>{errors.liveView.message}</p>}
        {errors.physicalEntry && <p className={styles.error}>{errors.physicalEntry.message}</p>}
      </div>

      {physicalEntry && (
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

      {showStageSelector && (
        <div className={styles.field}>
          <label className={styles.label}>{t('stagesLabel')}</label>
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
          <p className={styles.inputHint}>{t('stagesHint')}</p>
        </div>
      )}

      {createMutation.isError && (
        <p className={styles.error}>{createMutation.error?.message ?? t('errorAdd')}</p>
      )}
      {updateMutation.isError && (
        <p className={styles.error}>{updateMutation.error?.message ?? t('errorSave')}</p>
      )}

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
                  aria-label="edit"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() =>
                    isSeries
                      ? deleteSeriesMutation.mutate({ seriesId: seriesId!, productId: ticket.id })
                      : deleteEventMutation.mutate(ticket.id)
                  }
                  disabled={deleteMutation.isPending || editingId === ticket.id}
                  aria-label="remove"
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
          {ticket.capacity != null && (
            <p className={styles.inputHint}>
              {ticket.soldOut
                ? 'Esgotado'
                : `${ticket.capacity - (ticket.remaining ?? ticket.capacity)}/${ticket.capacity} vendidos · ${ticket.remaining ?? 0} restantes`}
            </p>
          )}
        </div>
      ))}

      {tickets.length === 0 && (
        <p className={styles.emptyHint}>{t('empty')}</p>
      )}
    </div>
  );
}
