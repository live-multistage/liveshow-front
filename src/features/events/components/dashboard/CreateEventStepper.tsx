import { Info, MapPin, Camera, Ticket, Image, Radio, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import styles from './CreateEventForm.module.scss';

interface Step {
  id: number;
  key: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  { id: 1, key: 'info', icon: Info },
  { id: 2, key: 'location', icon: MapPin },
  { id: 3, key: 'production', icon: Camera },
  { id: 4, key: 'stream', icon: Radio },
  { id: 5, key: 'tickets', icon: Ticket },
  { id: 6, key: 'images', icon: Image },
];

interface Props {
  current: number;
  onNavigate?: (step: number) => void;
}

export function CreateEventStepper({ current, onNavigate }: Props) {
  const t = useTranslations('createEvent.steps');

  return (
    <div className={styles.stepper}>
      {STEPS.map((s, i) => (
        <StepGroup
          key={s.id}
          step={s}
          label={t(s.key as Parameters<typeof t>[0])}
          isLast={i === STEPS.length - 1}
          done={current > s.id}
          active={current === s.id}
          onNavigate={s.id < 6 && current > s.id ? onNavigate : undefined}
        />
      ))}
    </div>
  );
}

interface StepGroupProps {
  step: Step;
  label: string;
  isLast: boolean;
  done: boolean;
  active: boolean;
  onNavigate?: (step: number) => void;
}

function StepGroup({ step, label, isLast, done, active, onNavigate }: StepGroupProps) {
  const navigable = !!onNavigate;
  const Icon = step.icon;

  const itemClass = [
    styles.stepItem,
    active ? styles.stepActive : '',
    done ? styles.stepDone : '',
    navigable ? styles.stepNavigable : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.stepGroup}>
      <div
        className={itemClass}
        role={navigable ? 'button' : undefined}
        tabIndex={navigable ? 0 : undefined}
        onClick={() => onNavigate?.(step.id)}
        onKeyDown={(e) => {
          if (navigable && (e.key === 'Enter' || e.key === ' ')) onNavigate?.(step.id);
        }}
      >
        <div className={styles.stepCircle}>
          {done ? <Check size={12} /> : <Icon size={12} />}
        </div>
        <span className={styles.stepLabel}>{label}</span>
      </div>

      {!isLast && (
        <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />
      )}
    </div>
  );
}
