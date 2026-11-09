'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Input, Label } from '@live-show/design-system';
import { usePlatformSettingsQuery, useSetAdOverlaySettingsMutation } from '../queries/get-settings';
import type { AdOverlaySettings } from '../types/platform-admin.types';
import { centsToReaisInput, reaisInputToCents } from '../utils/reais';
import cardStyles from './PlatformSettingsPage.module.scss';
import styles from './AdOverlaySettingsSection.module.scss';

type Key = keyof AdOverlaySettings;
type Draft = Record<Key, string>;

interface FieldSpec {
  key: Key;
  label: string;
  hint?: string;
  money?: boolean;
  // Limites inteiros da regra do backend.
  min?: number;
  max?: number;
  rangeError?: string;
}

const FIELDS: FieldSpec[] = [
  { key: 'adOverlayMinCpmCents', label: 'Lance mínimo · por mil exibições', hint: 'Por mil exibições. Vale para as 3 posições.', money: true },
  { key: 'adOverlayMinCpcCents', label: 'Lance mínimo · por clique', hint: 'Por clique.', money: true },
  { key: 'adOverlayGlobalMinIntervalMin', label: 'Intervalo mínimo por espectador (min)', hint: 'Entre duas vitrines quaisquer, de qualquer anunciante.', min: 1, max: 120, rangeError: 'Use de 1 a 120 minutos.' },
  { key: 'adOverlayMaxPerHour', label: 'Máximo por hora por espectador', min: 1, max: 12, rangeError: 'Use de 1 a 12.' },
  { key: 'adOverlayFirstAfterMin', label: 'Primeira vitrine depois de (min de sessão)', hint: 'Ninguém vê vitrine logo ao abrir a transmissão.', min: 0, max: 60, rangeError: 'Use de 0 a 60 minutos.' },
];

const toInput = (spec: FieldSpec, value: number) => (spec.money ? centsToReaisInput(value) : String(value));

// Valor em unidades do backend (centavos ou inteiro), ou null se inválido.
function parse(spec: FieldSpec, input: string): number | null {
  if (spec.money) {
    const cents = reaisInputToCents(input);
    return cents !== null && cents > 0 ? cents : null;
  }
  if (!/^\d+$/.test(input.trim())) return null;
  const n = Number(input);
  return n >= (spec.min ?? 0) && n <= (spec.max ?? Infinity) ? n : null;
}

const errorFor = (spec: FieldSpec) => spec.rangeError ?? 'Informe um valor maior que zero.';

// Vitrine (logo animada no player): lance mínimo e limites por espectador.
// O mínimo vale também para vitrines já aprovadas: o leilão descarta quem
// ficar abaixo dele, como na pausa. O kill switch é a flag ads_overlay.
export function AdOverlaySettingsSection() {
  const { data: settings } = usePlatformSettingsQuery();
  const save = useSetAdOverlaySettingsMutation();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (!settings || settings.adOverlayMinCpmCents === undefined) return;
    setDraft(Object.fromEntries(FIELDS.map((spec) => [spec.key, toInput(spec, settings[spec.key])])) as Draft);
  }, [settings]);

  if (!settings || settings.adOverlayMinCpmCents === undefined || !draft) return null;

  const parsed = FIELDS.map((spec) => [spec, parse(spec, draft[spec.key])] as const);
  const invalid = parsed.some(([, value]) => value === null);
  const unchanged = parsed.every(([spec, value]) => value === settings[spec.key]);

  function submit() {
    if (invalid) return;
    const payload = Object.fromEntries(parsed.map(([spec, value]) => [spec.key, value])) as AdOverlaySettings;
    save.mutate(payload, {
      onSuccess: () => toast.success('Configurações da vitrine salvas.'),
      onError: () => toast.error('Não foi possível salvar as configurações da vitrine.'),
    });
  }

  return (
    <section className={cardStyles.card} aria-label="Vitrine">
      <header className={cardStyles.sectionHeader}>
        <div className={cardStyles.mono10}>ANÚNCIOS</div>
        <div className={cardStyles.sectionTitle}>Vitrine</div>
      </header>
      <div className={styles.body}>
        <p className={styles.hint}>
          Logo animada sobre o player. O lance mínimo é único para as três posições; os limites valem por espectador, para
          anúncios de qualquer anunciante.
        </p>
        <div className={styles.grid}>
          {FIELDS.map((spec) => {
            const bad = parse(spec, draft[spec.key]) === null;
            return (
              <div key={spec.key} className={styles.field}>
                <Label htmlFor={spec.key}>{spec.label}</Label>
                <div className={styles.money}>
                  {spec.money && <span>R$</span>}
                  <Input
                    id={spec.key}
                    inputMode={spec.money ? 'decimal' : 'numeric'}
                    value={draft[spec.key]}
                    aria-invalid={bad}
                    onChange={(e) => setDraft({ ...draft, [spec.key]: e.target.value })}
                  />
                </div>
                {bad ? <span className={styles.error}>{errorFor(spec)}</span> : spec.hint && <span className={styles.fieldHint}>{spec.hint}</span>}
              </div>
            );
          })}
        </div>
        <p className={styles.note}>
          Kill switch: a flag <code>ads_overlay</code> liga e desliga a vitrine na plataforma (além de <code>ads_delivery</code>).
          Ela fica em Feature flags, logo abaixo.
        </p>
        <p className={styles.warn} role="note">
          Subir o mínimo depois da aprovação tira do leilão as vitrines com lance abaixo dele, como na pausa.
        </p>
        <Button onClick={submit} disabled={invalid || unchanged || save.isPending}>
          Salvar vitrine
        </Button>
      </div>
    </section>
  );
}
