'use client';

import { useTranslations } from 'next-intl';
import { Check, CreditCard } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import { useIsCompact, useActiveStep } from '../../hooks/useStickySteps';
import styles from './HowItWorks.module.scss';

interface StepData {
  title: string;
  text: string;
}

interface VisualCopy {
  accountLabel: string;
  accountValue: string;
  accountTitle: string;
  accountText: string;
  accountButton: string;
  billingLabel: string;
  availableBalance: string;
  creditCard: string;
  campaignLabel: string;
  horizontal: string;
  vertical: string;
  uploadCreative: string;
  uploadHint: string;
  dailyBudget: string;
  inReview: string;
  reviewTitle: string;
  reviewText: string;
  approved: string;
  approvedMeta: string;
  reportLabel: string;
  impressions: string;
  clicks: string;
  spend: string;
}

// Bar heights mirror the design mock's formula 1:1 (poCount-style decorative chart).
const CHART_BARS = Array.from({ length: 16 }, (_, i) => {
  const h = 25 + (i / 15) ** 1.8 * 65 + Math.abs(Math.sin(i * 2.1)) * 10;
  return { h: Math.round(Math.min(100, h) * 1000) / 1000, pink: i >= 13 };
});

function StepScreen({ step, visual }: { step: number; visual: VisualCopy }) {
  if (step === 0) {
    return (
      <>
        <div className={styles.brandRow}>
          show<span className={styles.brandAccent}>on</span>.io<span className={styles.adsBadge}>ADS</span>
        </div>
        <div className={styles.accountTitle}>{visual.accountTitle}</div>
        <div className={styles.accountText}>{visual.accountText}</div>
        <div className={styles.fieldLabel}>{visual.accountLabel}</div>
        <div className={styles.inputFocused}>
          {visual.accountValue}
          <span className={styles.caret} />
        </div>
        <div className={styles.submitPill}>{visual.accountButton}</div>
      </>
    );
  }

  if (step === 1) {
    return (
      <>
        <div className={styles.screenLabel}>{visual.billingLabel}</div>
        <div className={styles.balanceCard}>
          <div className={styles.balanceLabel}>{visual.availableBalance}</div>
          <div className={styles.balanceValue}>R$ 250,00</div>
        </div>
        <div className={styles.topupRow}>
          <span className={styles.topupChip}>+R$ 50</span>
          <span className={`${styles.topupChip} ${styles.topupActive}`}>+R$ 100</span>
          <span className={styles.topupChip}>+R$ 300</span>
        </div>
        <div className={styles.cardRow}>
          <CreditCard size={20} strokeWidth={2} />
          <span>{visual.creditCard}</span>
          <span className={styles.spacer} />
          <span className={styles.cardDigits}>•••• 4471</span>
        </div>
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <div className={styles.screenLabel}>{visual.campaignLabel}</div>
        <div className={styles.formatGrid}>
          <div className={`${styles.formatCard} ${styles.formatActive}`}>
            <span className={styles.formatBarActive} />
            <div className={styles.formatCardTitle}>{visual.horizontal}</div>
            <div className={styles.formatCardSpec}>728×90</div>
          </div>
          <div className={styles.formatCard}>
            <span className={styles.formatBar} />
            <div className={styles.formatCardTitle}>{visual.vertical}</div>
            <div className={styles.formatCardSpecDim}>300×600</div>
          </div>
        </div>
        <div className={styles.uploadBox}>
          <div className={styles.uploadTitle}>{visual.uploadCreative}</div>
          <div className={styles.uploadHint}>{visual.uploadHint}</div>
        </div>
        <div className={styles.bidRow}>
          <div className={styles.bidCard}>
            <div className={styles.bidLabel}>CPM</div>
            <div className={styles.bidValue}>R$ 4,50</div>
          </div>
          <div className={styles.bidCard}>
            <div className={styles.bidLabel}>{visual.dailyBudget}</div>
            <div className={styles.bidValueMuted}>R$ 50</div>
          </div>
        </div>
      </>
    );
  }

  if (step === 3) {
    return (
      <>
        <div className={styles.reviewCard}>
          <div className={styles.reviewCardHead}>
            <span className={styles.pulseDot} />
            <span className={styles.reviewLabel}>{visual.inReview}</span>
          </div>
          <div className={styles.reviewTitle}>{visual.reviewTitle}</div>
          <div className={styles.reviewText}>{visual.reviewText}</div>
        </div>
        <div className={styles.approvedCard}>
          <span className={styles.approvedIcon}>
            <Check size={16} strokeWidth={2.6} />
          </span>
          <div>
            <div className={styles.approvedTitle}>{visual.approved}</div>
            <div className={styles.approvedMeta}>{visual.approvedMeta}</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.screenLabel}>{visual.reportLabel}</div>
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{visual.impressions}</div>
          <div className={styles.kpiValue}>184k</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{visual.clicks}</div>
          <div className={styles.kpiValue}>8.420</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{visual.spend}</div>
          <div className={styles.kpiValuePrice}>R$ 2.140</div>
        </div>
      </div>
      <div className={styles.chartBox}>
        <div className={styles.chart}>
          {CHART_BARS.map((bar, i) => (
            <span key={i} className={bar.pink ? styles.barPink : styles.bar} style={{ height: `${bar.h}%` }} />
          ))}
        </div>
      </div>
    </>
  );
}

export function HowItWorks() {
  const t = useTranslations('advertisersPage');
  const isCompact = useIsCompact();
  const steps = t.raw('howItWorks.steps') as StepData[];
  const [activeStep, setStepRef] = useActiveStep(steps.length);

  const visual: VisualCopy = {
    accountLabel: t('howItWorks.visual.accountLabel'),
    accountValue: t('howItWorks.visual.accountValue'),
    accountTitle: t('howItWorks.visual.accountTitle'),
    accountText: t('howItWorks.visual.accountText'),
    accountButton: t('howItWorks.visual.accountButton'),
    billingLabel: t('howItWorks.visual.billingLabel'),
    availableBalance: t('howItWorks.visual.availableBalance'),
    creditCard: t('howItWorks.visual.creditCard'),
    campaignLabel: t('howItWorks.visual.campaignLabel'),
    horizontal: t('howItWorks.visual.horizontal'),
    vertical: t('howItWorks.visual.vertical'),
    uploadCreative: t('howItWorks.visual.uploadCreative'),
    uploadHint: t('howItWorks.visual.uploadHint'),
    dailyBudget: t('howItWorks.visual.dailyBudget'),
    inReview: t('howItWorks.visual.inReview'),
    reviewTitle: t('howItWorks.visual.reviewTitle'),
    reviewText: t('howItWorks.visual.reviewText'),
    approved: t('howItWorks.visual.approved'),
    approvedMeta: t('howItWorks.visual.approvedMeta'),
    reportLabel: t('howItWorks.visual.reportLabel'),
    impressions: t('howItWorks.visual.impressions'),
    clicks: t('howItWorks.visual.clicks'),
    spend: t('howItWorks.visual.spend'),
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.headerWrap}>
          <SectionHeader label={t('howItWorks.label')} title={t('howItWorks.title')} maxTitleCh={18} />
        </div>

        {isCompact ? (
          <div className={styles.compactList}>
            {steps.map((step, index) => (
              <div key={step.title} className={styles.compactItem}>
                <div className={styles.stepNum}>{`0${index + 1} / 05`}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepText}>{step.text}</p>
                <div className={styles.compactScreen}>
                  <StepScreen step={index} visual={visual} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.grid}>
            <div className={styles.steps}>
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  data-step={index}
                  ref={(el) => setStepRef(index, el)}
                  className={[styles.step, index === activeStep ? styles.active : ''].join(' ').trim()}
                >
                  <div className={[styles.stepNum, index === activeStep ? styles.active : ''].join(' ').trim()}>
                    {`0${index + 1} / 05`}
                  </div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepText}>{step.text}</p>
                </div>
              ))}
            </div>

            <div className={styles.visualWrap}>
              <div className={styles.glow} />
              <div className={styles.panel}>
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={[styles.screen, index === activeStep ? styles.active : ''].join(' ').trim()}
                  >
                    <StepScreen step={index} visual={visual} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
