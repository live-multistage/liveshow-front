'use client';

import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { CreateCouponRequest, DiscountType } from '../types/coupon.types';
import styles from './CreateCouponModal.module.scss';

interface FormValues {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  eventId: string;
  minOrderAmount: string;
  maxUses: string;
  expiresAt: string;
}

interface Props {
  isOpen: boolean;
  orgId: string;
  events: { id: string; title: string }[];
  isPending: boolean;
  error?: string | null;
  onClose: () => void;
  onCreate: (payload: CreateCouponRequest) => void;
}

export function CreateCouponModal({ isOpen, orgId, events, isPending, error, onClose, onCreate }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { discountType: 'PERCENTAGE' },
  });

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = (values: FormValues) => {
    const payload: CreateCouponRequest = {
      code: values.code.trim().toUpperCase(),
      discountType: values.discountType,
      discountValue: Number(values.discountValue),
      orgId,
    };
    if (values.eventId) payload.eventId = values.eventId;
    if (values.minOrderAmount) payload.minOrderAmount = Number(values.minOrderAmount);
    if (values.maxUses) payload.maxUses = Number(values.maxUses);
    if (values.expiresAt) payload.expiresAt = new Date(values.expiresAt).toISOString();
    onCreate(payload);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Criar Cupom</h2>
          <button className={styles.closeBtn} onClick={handleClose} type="button">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Código *</label>
              <input
                {...register('code', { required: 'Obrigatório', minLength: { value: 3, message: 'Mínimo 3 caracteres' } })}
                className={`${styles.input} ${errors.code ? styles.inputError : ''}`}
                placeholder="DESCONTO20"
                style={{ textTransform: 'uppercase' }}
              />
              {errors.code && <p className={styles.error}>{errors.code.message}</p>}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Evento (opcional)</label>
            <select {...register('eventId')} className={styles.select} defaultValue="">
              <option value="">Toda a organização</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Tipo *</label>
              <select {...register('discountType')} className={styles.select}>
                <option value="PERCENTAGE">Porcentagem (%)</option>
                <option value="FIXED_AMOUNT">Valor fixo (R$)</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Valor *</label>
              <input
                {...register('discountValue', { required: 'Obrigatório', min: { value: 0.01, message: 'Deve ser positivo' } })}
                type="number"
                step="0.01"
                min="0"
                className={`${styles.input} ${errors.discountValue ? styles.inputError : ''}`}
                placeholder="10"
              />
              {errors.discountValue && <p className={styles.error}>{errors.discountValue.message}</p>}
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Pedido mínimo (R$)</label>
              <input
                {...register('minOrderAmount')}
                type="number"
                step="0.01"
                min="0"
                className={styles.input}
                placeholder="0,00"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Máx. de usos</label>
              <input
                {...register('maxUses')}
                type="number"
                min="1"
                className={styles.input}
                placeholder="Ilimitado"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Validade</label>
            <input
              {...register('expiresAt')}
              type="datetime-local"
              className={styles.input}
            />
          </div>

          {error && <p className={`${styles.error} ${styles.globalError}`}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar Cupom'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
