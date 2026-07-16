'use client';

import { useEffect, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import {
  usePlatformSettingsQuery,
  useSetDefaultFeeRateMutation,
  useGlobalFlagsQuery,
  useSetGlobalFlagMutation,
} from '@/features/platform-admin/queries/get-settings';
import { ratePct } from '@/features/platform-admin/utils/format';
import styles from './SuperAdminDashboard.module.scss';

// Config card (design: "Taxas & flags globais"). Default fee is editable via
// the existing platform-settings endpoint; global flags toggle via the
// feature-flags endpoint. Buyer fee (CART_TAX_RATE) stays env-configured — no
// runtime endpoint yet — so it's not shown here (migrate to DB later).
export function PlatformSettingsCard() {
  const { data: settings } = usePlatformSettingsQuery();
  const setFee = useSetDefaultFeeRateMutation();
  const { data: flags } = useGlobalFlagsQuery();
  const setFlag = useSetGlobalFlagMutation();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (settings && !editing) setDraft((settings.defaultFeeRate * 100).toString().replace('.', ','));
  }, [settings, editing]);

  const save = () => {
    const pct = Number(draft.replace(',', '.'));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return;
    setFee.mutate(pct / 100, { onSuccess: () => setEditing(false) });
  };

  return (
    <div className={styles.finCard}>
      <div className={styles.finEyebrow}>CONFIGURAÇÕES · PLATFORM-SETTINGS</div>
      <div className={styles.finTitle} style={{ marginBottom: 18 }}>Taxas & flags globais</div>

      <div className={styles.setRow}>
        <div>
          <div className={styles.setLabel}>Taxa default da plataforma</div>
          <div className={styles.setSub}>Comissão sobre vendas</div>
        </div>
        {editing ? (
          <div className={styles.setEdit}>
            <input
              className={styles.setInput}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              inputMode="decimal"
            />
            <span className={styles.setPct}>%</span>
            <button className={styles.setIconOk} onClick={save} disabled={setFee.isPending}>
              <Check size={14} />
            </button>
            <button className={styles.setIcon} onClick={() => setEditing(false)}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className={styles.setEdit}>
            <span className={styles.setValue}>{settings ? ratePct(settings.defaultFeeRate) : '—'}</span>
            <button className={styles.setIcon} onClick={() => setEditing(true)} aria-label="Editar">
              <Pencil size={13} />
            </button>
          </div>
        )}
      </div>

      <div className={styles.setRow}>
        <div>
          <div className={styles.setLabel}>Taxa do comprador</div>
          <div className={styles.setSubMono}>CART_TAX_RATE (env)</div>
        </div>
        <span className={styles.setValueMuted}>via ambiente</span>
      </div>

      <div className={styles.setFlagsHead}>FEATURE FLAGS GLOBAIS</div>
      <div className={styles.setFlags}>
        {flags &&
          Object.entries(flags).map(([key, on]) => (
            <div key={key} className={styles.setFlagRow}>
              <span className={styles.setFlagKey}>{key}</span>
              <button
                className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
                onClick={() => setFlag.mutate({ key, enabled: !on })}
                disabled={setFlag.isPending}
                aria-label={`Toggle ${key}`}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
