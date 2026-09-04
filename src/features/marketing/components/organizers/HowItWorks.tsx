'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { SectionHeader } from '../shared/SectionHeader';
import styles from './HowItWorks.module.scss';

interface StepData {
  title: string;
  text: string;
}

// ponytail: no shared useMediaQuery hook exists yet; this is the only caller,
// add one to shared/ if a second component needs it.
function useIsCompact(): boolean {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(max-width: 1024px)');
    setIsCompact(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setIsCompact(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isCompact;
}

function useActiveStep(stepCount: number): [number, (index: number, el: HTMLDivElement | null) => void] {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    let ticking = false;

    const computeActive = () => {
      ticking = false;
      const viewportCenter = window.innerHeight / 2;
      let closestIndex = 0;
      let closestDistance = Infinity;

      for (let i = 0; i < stepCount; i += 1) {
        const el = refs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      }

      if (closestIndex !== activeRef.current) setActive(closestIndex);
    };

    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(computeActive);
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepCount]);

  const setRef = (index: number, el: HTMLDivElement | null) => {
    refs.current[index] = el;
  };

  return [active, setRef];
}

interface VisualCopy {
  newOrg: string;
  logo: string;
  logoHint: string;
  nameLabel: string;
  nameValue: string;
  descLabel: string;
  descValue: string;
  inReview: string;
  reviewOrg: string;
  reviewText: string;
  approved: string;
  approvedMeta: string;
  payoutAccount: string;
  stripe: string;
  stripeHint: string;
  connected: string;
  nextPayout: string;
  account: string;
  event: string;
  ticketDigital: string;
  ticketPhysical: string;
  publish: string;
}

function StepScreen({ step, visual }: { step: number; visual: VisualCopy }) {
  if (step === 0) {
    return (
      <>
        <div className={styles.screenLabel}>{visual.newOrg}</div>
        <div className={styles.orgFormRow}>
          <div className={styles.dropzone}>
            <Plus size={22} strokeWidth={2} />
          </div>
          <div>
            <div className={styles.fieldValue}>{visual.logo}</div>
            <div className={styles.fieldHint}>{visual.logoHint}</div>
          </div>
        </div>
        <div className={styles.fieldLabel}>{visual.nameLabel}</div>
        <div className={styles.inputFocused}>
          {visual.nameValue}
          <span className={styles.caret} />
        </div>
        <div className={styles.fieldLabel}>{visual.descLabel}</div>
        <div className={styles.textarea}>{visual.descValue}</div>
      </>
    );
  }

  if (step === 1) {
    return (
      <>
        <div className={styles.reviewCard}>
          <div className={styles.reviewCardHead}>
            <span className={styles.pulseDot} />
            <span className={styles.reviewLabel}>{visual.inReview}</span>
          </div>
          <div className={styles.reviewOrgName}>{visual.reviewOrg}</div>
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

  if (step === 2) {
    return (
      <>
        <div className={styles.screenLabel}>{visual.payoutAccount}</div>
        <div className={styles.stripeRow}>
          <div className={styles.stripeInfo}>
            <span className={styles.stripeBadge}>S</span>
            <div>
              <div className={styles.stripeTitle}>{visual.stripe}</div>
              <div className={styles.stripeHint}>{visual.stripeHint}</div>
            </div>
          </div>
          <span className={styles.connectedPill}>{visual.connected}</span>
        </div>
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{visual.nextPayout}</div>
            <div className={styles.statValuePrice}>R$ 4.860,00</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{visual.account}</div>
            <div className={styles.statValue}>•••• 4471</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.publishHead}>
        <div className={styles.poster}>
          <span className={styles.posterLabel}>POSTER</span>
        </div>
        <div className={styles.publishInfo}>
          <div className={styles.eventTitle}>{visual.event}</div>
          <div className={styles.chipRow}>
            <span className={styles.chip}>SÁB 21 SET · 19:00</span>
            <span className={styles.chip}>4 CÂMERAS</span>
            <span className={styles.chip}>SRT</span>
          </div>
        </div>
      </div>
      <div className={styles.ticketList}>
        <div className={styles.ticketRow}>
          <span>{visual.ticketDigital}</span>
          <span className={styles.ticketPrice}>R$ 29,90</span>
        </div>
        <div className={styles.ticketRow}>
          <span>{visual.ticketPhysical}</span>
          <span className={styles.ticketPrice}>R$ 60,00</span>
        </div>
      </div>
      <div className={styles.publishPill}>
        {visual.publish}
        <ArrowRight size={15} strokeWidth={2.6} />
      </div>
    </>
  );
}

export function HowItWorks() {
  const t = useTranslations('organizersPage');
  const isCompact = useIsCompact();
  const steps = t.raw('howItWorks.steps') as StepData[];
  const [activeStep, setStepRef] = useActiveStep(steps.length);

  const visual: VisualCopy = {
    newOrg: t('howItWorks.visual.newOrg'),
    logo: t('howItWorks.visual.logo'),
    logoHint: t('howItWorks.visual.logoHint'),
    nameLabel: t('howItWorks.visual.nameLabel'),
    nameValue: t('howItWorks.visual.nameValue'),
    descLabel: t('howItWorks.visual.descLabel'),
    descValue: t('howItWorks.visual.descValue'),
    inReview: t('howItWorks.visual.inReview'),
    reviewOrg: t('howItWorks.visual.reviewOrg'),
    reviewText: t('howItWorks.visual.reviewText'),
    approved: t('howItWorks.visual.approved'),
    approvedMeta: t('howItWorks.visual.approvedMeta'),
    payoutAccount: t('howItWorks.visual.payoutAccount'),
    stripe: t('howItWorks.visual.stripe'),
    stripeHint: t('howItWorks.visual.stripeHint'),
    connected: t('howItWorks.visual.connected'),
    nextPayout: t('howItWorks.visual.nextPayout'),
    account: t('howItWorks.visual.account'),
    event: t('howItWorks.visual.event'),
    ticketDigital: t('howItWorks.visual.ticketDigital'),
    ticketPhysical: t('howItWorks.visual.ticketPhysical'),
    publish: t('howItWorks.visual.publish'),
  };

  return (
    <section id="como-funciona" className={styles.section}>
      <div className={styles.container}>
        <div className={styles.headerWrap}>
          <SectionHeader label={t('howItWorks.label')} title={t('howItWorks.title')} maxTitleCh={18} />
        </div>

        {isCompact ? (
          <div className={styles.compactList}>
            {steps.map((step, index) => (
              <div key={step.title} className={styles.compactItem}>
                <div className={styles.stepNum}>{`0${index + 1} / 0${steps.length}`}</div>
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
                    {`0${index + 1} / 0${steps.length}`}
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
