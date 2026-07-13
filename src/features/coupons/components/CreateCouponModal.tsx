'use client';

import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { CreateCouponRequest, DiscountType } from '../types/coupon.types';
import styles from './CreateCouponModal.module.scss';

interface FormValues {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  orgChoice: string;
  eventId: string;
  minOrderAmount: string;
  maxUses: string;
  expiresAt: string;
}

interface Props {
  isOpen: boolean;
  orgs: { id: string; name: string }[];
  defaultOrgId: string;
  events: { id: string; title: string }[];
  isPending: boolean;
  error?: string | null;
  onClose: () => void;
  onCreate: (payload: CreateCouponRequest) => void;
}

const ALL_ORGS = '__ALL__';

export function CreateCouponModal({ isOpen, orgs, defaultOrgId, events, isPending, error, onClose, onCreate }: Props) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: { discountType: 'PERCENTAGE', orgChoice: defaultOrgId },
  });

  const orgChoice = watch('orgChoice');

  const handleClose = () => {
    reset({ discountType: 'PERCENTAGE', orgChoice: defaultOrgId });
    onClose();
  };

  const onSubmit = (values: FormValues) => {
    const payload: CreateCouponRequest = {
      code: values.code.trim().toUpperCase(),
      discountType: values.discountType,
      discountValue: Number(values.discountValue),
      orgIds: values.orgChoice === ALL_ORGS ? orgs.map((o) => o.id) : [values.orgChoice],
    };
    if (values.eventId && values.orgChoice !== ALL_ORGS) payload.eventId = values.eventId;
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
            <label className={styles.label}>Organização *</label>
            <select {...register('orgChoice')} className={styles.select}>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
              {orgs.length > 1 && <option value={ALL_ORGS}>Todas as minhas organizações</option>}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Evento (opcional)</label>
            <select
              {...register('eventId')}
              className={styles.select}
              defaultValue=""
              disabled={orgChoice === ALL_ORGS}
            >
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
