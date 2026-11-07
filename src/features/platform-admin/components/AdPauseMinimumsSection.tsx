'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Input, Label } from '@live-show/design-system';
import { usePlatformSettingsQuery, useSetAdPauseMinimumsMutation } from '../queries/get-settings';
import type { AdPauseMinimums } from '../types/platform-admin.types';
import { centsToReaisInput, reaisInputToCents } from '../utils/reais';
import cardStyles from './PlatformSettingsPage.module.scss';
import styles from './AdPauseMinimumsSection.module.scss';

type Field = keyof AdPauseMinimums;

const FIELDS: { key: Field; label: string }[] = [
  { key: 'adPauseMinCpmStandardCents', label: 'Padrão · por mil exibições' },
  { key: 'adPauseMinCpcStandardCents', label: 'Padrão · por clique' },
  { key: 'adPauseMinCpmFullscreenCents', label: 'Tela cheia · por mil exibições' },
  { key: 'adPauseMinCpcFullscreenCents', label: 'Tela cheia · por clique' },
];

// Lance mínimo do anúncio na pausa do player, por variante e modelo de
// cobrança. Vale para anúncios novos e já aprovados: o leilão descarta quem
// ficar abaixo do mínimo atual.
export function AdPauseMinimumsSection() {
  const { data: settings } = usePlatformSettingsQuery();
  const save = useSetAdPauseMinimumsMutation();
  const [draft, setDraft] = useState<Record<Field, string> | null>(null);

  useEffect(() => {
    if (!settings) return;
    setDraft(
      Object.fromEntries(FIELDS.map(({ key }) => [key, centsToReaisInput(settings[key])])) as Record<Field, string>,
    );
  }, [settings]);

  if (!settings || !draft) return null;

  const parsed = FIELDS.map(({ key }) => [key, reaisInputToCents(draft[key])] as const);
  const invalid = parsed.some(([, cents]) => cents === null || cents <= 0);
  const unchanged = parsed.every(([key, cents]) => cents === settings[key]);

  function submit() {
    if (invalid) return;
    const payload = Object.fromEntries(parsed) as AdPauseMinimums;
    save.mutate(payload, {
      onSuccess: () => toast.success('Mínimos da pausa salvos.'),
      onError: () => toast.error('Não foi possível salvar os mínimos da pausa.'),
    });
  }

  return (
    <section className={cardStyles.card} aria-label="Lance mínimo da pausa">
      <header className={cardStyles.sectionHeader}>
        <div className={cardStyles.mono10}>ANÚNCIOS</div>
        <div className={cardStyles.sectionTitle}>Lance mínimo da pausa</div>
      </header>
      <div className={styles.body}>
        <p className={styles.hint}>
          Piso do lance do anúncio na pausa do player, por variante e modelo de cobrança. Vale também para anúncios já
          aprovados: o leilão descarta quem ficar abaixo do mínimo atual.
        </p>
        <div className={styles.grid}>
          {FIELDS.map(({ key, label }) => {
            const cents = reaisInputToCents(draft[key]);
            const bad = cents === null || cents <= 0;
            return (
              <div key={key} className={styles.field}>
                <Label htmlFor={key}>{label}</Label>
                <div className={styles.money}>
                  <span>R$</span>
                  <Input
                    id={key}
                    inputMode="decimal"
                    value={draft[key]}
                    aria-invalid={bad}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  />
                </div>
                {bad && <span className={styles.error}>Informe um valor maior que zero.</span>}
              </div>
            );
          })}
        </div>
        <Button onClick={submit} disabled={invalid || unchanged || save.isPending}>
          Salvar mínimos
        </Button>
      </div>
    </section>
  );
}
