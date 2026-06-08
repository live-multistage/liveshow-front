import { Info, MapPin, Camera, Ticket, Image, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from './CreateEventForm.module.scss';

interface Step {
  id: number;
  label: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  { id: 1, label: 'Informações', icon: Info },
  { id: 2, label: 'Local & Data', icon: MapPin },
  { id: 3, label: 'Produção', icon: Camera },
  { id: 4, label: 'Ingressos', icon: Ticket },
  { id: 5, label: 'Imagens', icon: Image },
];

interface Props {
  current: number;
  onNavigate?: (step: number) => void;
}

export function CreateEventStepper({ current, onNavigate }: Props) {
  return (
    <div className={styles.stepper}>
      {STEPS.map((s, i) => (
        <StepGroup
          key={s.id}
          step={s}
          isLast={i === STEPS.length - 1}
          done={current > s.id}
          active={current === s.id}
          onNavigate={s.id < 5 && current > s.id ? onNavigate : undefined}
        />
      ))}
    </div>
  );
}

interface StepGroupProps {
  step: Step;
  isLast: boolean;
  done: boolean;
  active: boolean;
  onNavigate?: (step: number) => void;
}

function StepGroup({ step, isLast, done, active, onNavigate }: StepGroupProps) {
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
        <span className={styles.stepLabel}>{step.label}</span>
      </div>

      {!isLast && (
        <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />
      )}
    </div>
  );
}
