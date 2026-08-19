'use client';

import { useState } from 'react';
import { X, Ticket, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { CreateCouponRequest, DiscountType } from '../types/coupon.types';
import styles from './CreateCouponModal.module.scss';

type ScopeChoice = 'org' | 'all' | 'event';

interface FormValues {
  code: string;
  discountValue: string;
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

export function CreateCouponModal({ isOpen, orgs, defaultOrgId, events, isPending, error, onClose, onCreate }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [scope, setScope] = useState<ScopeChoice>('org');

  const orgName = orgs.find((o) => o.id === defaultOrgId)?.name ?? 'sua organização';
  const multiOrg = orgs.length > 1;

  const handleClose = () => {
    reset();
    setDiscountType('PERCENTAGE');
    setScope('org');
    onClose();
  };

  const onSubmit = (values: FormValues) => {
    const payload: CreateCouponRequest = {
      code: values.code.trim().toUpperCase(),
      discountType,
      discountValue: Number(values.discountValue),
      orgIds: scope === 'all' ? orgs.map((o) => o.id) : [defaultOrgId],
    };
    if (scope === 'event' && values.eventId) payload.eventId = values.eventId;
    if (values.minOrderAmount) payload.minOrderAmount = Number(values.minOrderAmount);
    if (values.maxUses) payload.maxUses = Number(values.maxUses);
    if (values.expiresAt) payload.expiresAt = new Date(values.expiresAt).toISOString();
    onCreate(payload);
  };

  if (!isOpen) return null;

  const scopeOptions: { id: ScopeChoice; title: string; desc: string; show: boolean }[] = [
    { id: 'org', title: 'Organização toda', desc: `Vale em todos os eventos de ${orgName}.`, show: true },
    { id: 'all', title: 'Todas as minhas organizações', desc: 'Vale em eventos de todas as suas organizações.', show: multiOrg },
    { id: 'event', title: 'Evento específico', desc: 'Restrito a um único evento selecionado.', show: true },
  ];

  return (
    <>
      <div className={styles.overlay} onClick={handleClose} />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Criar cupom">
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>NOVO CUPOM</div>
            <div className={styles.title}>Criar Cupom</div>
          </div>
          <button className={styles.closeBtn} onClick={handleClose} type="button" aria-label="Fechar">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.body}>
            <label className={styles.label}>Código do cupom</label>
            <div className={styles.codeField}>
              <Ticket size={15} />
              <input
                {...register('code', { required: 'Obrigatório', minLength: { value: 3, message: 'Mínimo 3 caracteres' } })}
                placeholder="DESCONTO20"
                autoFocus
              />
            </div>
            {errors.code && <p className={styles.error}>{errors.code.message}</p>}

            <div className={styles.grid2}>
              <div>
                <label className={styles.label}>Tipo</label>
                <div className={styles.segmented}>
                  <button
                    type="button"
                    className={`${styles.segment} ${discountType === 'PERCENTAGE' ? styles.segmentActive : ''}`}
                    onClick={() => setDiscountType('PERCENTAGE')}
                  >
                    % OFF
                  </button>
                  <button
                    type="button"
                    className={`${styles.segment} ${discountType === 'FIXED_AMOUNT' ? styles.segmentActive : ''}`}
                    onClick={() => setDiscountType('FIXED_AMOUNT')}
                  >
                    R$ OFF
                  </button>
                </div>
              </div>
              <div>
                <label className={styles.label}>Valor</label>
                <div className={styles.valueField}>
                  {discountType === 'FIXED_AMOUNT' && <span>R$</span>}
                  <input
                    {...register('discountValue', { required: 'Obrigatório', min: { value: 0.01, message: 'Deve ser positivo' } })}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="20"
                  />
                  {discountType === 'PERCENTAGE' && <span>%</span>}
                </div>
                {errors.discountValue && <p className={styles.error}>{errors.discountValue.message}</p>}
              </div>
            </div>

            <label className={styles.label}>Escopo</label>
            <div className={styles.scopeList} role="radiogroup" aria-label="Escopo do cupom">
              {scopeOptions.filter((s) => s.show).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={scope === s.id}
                  className={`${styles.scopeCard} ${scope === s.id ? styles.scopeCardSelected : ''}`}
                  onClick={() => setScope(s.id)}
                >
                  <span className={`${styles.radio} ${scope === s.id ? styles.radioSelected : ''}`} />
                  <span>
                    <span className={styles.scopeTitle}>{s.title}</span>
                    <br />
                    <span className={styles.scopeDesc}>{s.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            {scope === 'event' && (
              <>
                <label className={styles.label}>Evento</label>
                <select
                  {...register('eventId', { required: scope === 'event' ? 'Escolha um evento' : false })}
                  className={styles.eventSelect}
                  defaultValue=""
                >
                  <option value="" disabled>Selecione um evento…</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
                {errors.eventId && <p className={styles.error}>{errors.eventId.message}</p>}
              </>
            )}

            <div className={styles.grid3}>
              <div>
                <label className={styles.label}>Pedido mín.</label>
                <div className={styles.moneyField}>
                  <span>R$</span>
                  <input {...register('minOrderAmount')} type="number" step="0.01" min="0" placeholder="0,00" />
                </div>
              </div>
              <div>
                <label className={styles.label}>Máx. usos</label>
                <input {...register('maxUses')} type="number" min="1" placeholder="∞" className={styles.smallInput} />
              </div>
              <div>
                <label className={styles.label}>Validade</label>
                <input {...register('expiresAt')} type="datetime-local" className={styles.smallInput} />
              </div>
            </div>

            {error && <p className={`${styles.error} ${styles.globalError}`}>{error}</p>}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={handleClose}>
              CANCELAR
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isPending}>
              <Plus size={15} strokeWidth={2.6} />
              {isPending ? 'Criando…' : 'Criar Cupom'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
