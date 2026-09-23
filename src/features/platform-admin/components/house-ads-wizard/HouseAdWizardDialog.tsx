'use client';

import { AlertTriangle, Check } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogTitle, DialogDescription } from '@live-show/design-system';
import type { HouseAdListItem } from '../../house-ads';
import { Step1CreativeDestination } from './Step1CreativeDestination';
import { Step2PlacementsAudience } from './Step2PlacementsAudience';
import { Step3PeriodPriority } from './Step3PeriodPriority';
import { Step4Review } from './Step4Review';
import { useHouseAdWizardForm, type WizardStep } from './useHouseAdWizardForm';
import styles from './HouseAdWizardDialog.module.scss';

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Criativo e destino',
  2: 'Posições e público',
  3: 'Período e prioridade',
  4: 'Revisão',
};

export interface HouseAdWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit an existing ad (must be DRAFT or PAUSED — the caller
   * decides whether to offer the edit action at all; this dialog doesn't
   * re-check the status). Absent = create a new one. */
  ad?: HouseAdListItem | null;
  /** Called after a successful publish/save, right before the dialog closes. */
  onSaved?: () => void;
}

// Entry point for F2 (PlatformAdsPage): render
// <HouseAdWizardDialog open={...} onOpenChange={...} ad={editingAd ?? null} onSaved={...} />
// for both "Novo anúncio" (ad omitted) and a row's "Editar" action (ad set).
export function HouseAdWizardDialog({ open, onOpenChange, ad = null, onSaved = () => {} }: HouseAdWizardDialogProps) {
  const form = useHouseAdWizardForm({
    ad,
    open,
    onSaved: () => {
      onSaved();
      onOpenChange(false);
    },
  });

  const isLastStep = form.step === 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.dialogContent}>
        <div className={styles.header}>
          <div>
            <DialogTitle className={styles.title}>
              {form.isEdit ? 'Editar anúncio' : 'Novo anúncio da plataforma'}
            </DialogTitle>
            <DialogDescription className={styles.subtitle}>Sem custo · sem conta de anunciante</DialogDescription>
          </div>

          {form.isEdit && (
            <div className={styles.warningBanner}>
              <AlertTriangle size={16} aria-hidden />
              <span>As alterações valem para as próximas exibições. Impressões e cliques já registrados não mudam.</span>
            </div>
          )}

          <nav className={styles.stepper} aria-label="Etapas do anúncio">
            {([1, 2, 3, 4] as WizardStep[]).map((s) => (
              <button
                key={s}
                type="button"
                className={styles.stepLabel}
                disabled={s > form.step}
                onClick={() => s < form.step && form.goToStep(s)}
                aria-current={s === form.step ? 'step' : undefined}
              >
                <span className={`${styles.stepDot} ${s === form.step ? styles.stepDotActive : ''} ${s < form.step ? styles.stepDotDone : ''}`}>
                  {s < form.step ? <Check size={12} /> : s}
                </span>
                <span className={s === form.step ? styles.stepLabelActive : ''}>{STEP_LABELS[s]}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className={styles.body}>
          {form.detailLoading ? (
            <p className={styles.hint}>Carregando dados do anúncio…</p>
          ) : form.detailError ? (
            <p className={styles.error}>
              Não foi possível carregar os dados do anúncio. Feche e tente novamente.
            </p>
          ) : (
            <>
              {form.step === 1 && (
                <Step1CreativeDestination
                  draft={form.draft}
                  update={form.update}
                  setFormat={form.setFormat}
                  setCreativeFile={form.setCreativeFile}
                />
              )}
              {form.step === 2 && (
                <Step2PlacementsAudience draft={form.draft} update={form.update} togglePlacement={form.togglePlacement} />
              )}
              {form.step === 3 && <Step3PeriodPriority draft={form.draft} update={form.update} />}
              {form.step === 4 && <Step4Review draft={form.draft} submitError={form.submitError} />}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <div className={styles.footerActions}>
            {form.step > 1 && (
              <Button type="button" variant="outline" onClick={form.back} disabled={form.submitting}>
                ← Voltar
              </Button>
            )}
            {!isLastStep ? (
              <Button type="button" onClick={form.next} disabled={!form.canProceed}>
                Continuar →
              </Button>
            ) : (
              <Button type="button" onClick={form.submit} disabled={form.submitting || form.detailLoading || form.detailError}>
                {form.submitting
                  ? form.isEdit ? 'Salvando…' : 'Publicando…'
                  : form.isEdit ? 'Salvar alterações' : 'Publicar'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
