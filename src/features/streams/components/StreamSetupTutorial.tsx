'use client';

import { useState } from 'react';
import { X, Radio, Layers, Rss, Camera, Plug, ChevronRight, ArrowLeft } from 'lucide-react';
import { useCreateStreamMutation } from '../mutations/stream.mutations';
import { useCreateStageMutation } from '../mutations/stage.mutations';
import { useCreateFeedMutation } from '../mutations/feed.mutations';
import { useCreateCameraMutation } from '../mutations/camera.mutations';
import { IngestCredentials } from './IngestCredentials';
import type { StreamResponse } from '../types/stream.types';
import styles from './StreamSetupTutorial.module.scss';

// ── Step metadata ─────────────────────────────────────────────────

const STEPS = [
  {
    id: 'welcome',
    icon: Radio,
    label: 'Começar',
    title: 'Configure sua transmissão',
    subtitle: 'Em 5 passos você conecta o OBS e vai ao ar.',
  },
  {
    id: 'stream',
    icon: Radio,
    label: 'Stream',
    title: 'Crie a stream',
    subtitle: 'Dê um nome para identificar esta transmissão.',
  },
  {
    id: 'stage',
    icon: Layers,
    label: 'Palco',
    title: 'Adicione um palco',
    subtitle: 'Palcos agrupam as câmeras do seu evento (ex: Palco Principal).',
  },
  {
    id: 'feed',
    icon: Rss,
    label: 'Feed',
    title: 'Crie um feed',
    subtitle: 'Feeds são os canais de vídeo dentro do palco (ex: Câmera Central).',
  },
  {
    id: 'camera',
    icon: Camera,
    label: 'Câmera',
    title: 'Adicione uma câmera',
    subtitle: 'Câmeras recebem o sinal do OBS ou software de streaming.',
  },
  {
    id: 'connect',
    icon: Plug,
    label: 'Conectar',
    title: 'Conecte seu OBS',
    subtitle: 'Use as credenciais abaixo para configurar o OBS Studio.',
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];

// ── Field component ───────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {multiline ? (
        <textarea
          className={styles.fieldTextarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          className={styles.fieldInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
        />
      )}
    </div>
  );
}

// ── OBS Setup instructions ────────────────────────────────────────

function ObsInstructions({ cameraId }: { cameraId: string }) {
  return (
    <div className={styles.obsWrap}>
      <IngestCredentials cameraId={cameraId} />

      <div className={styles.obsSteps}>
        <p className={styles.obsStepsTitle}>Como configurar no OBS Studio</p>
        <ol className={styles.obsList}>
          <li>Abra o OBS Studio e vá em <strong>Configurações → Transmissão</strong></li>
          <li>Em <strong>Serviço</strong>, selecione <strong>Personalizado</strong></li>
          <li>Cole o <strong>Servidor (SRT URL)</strong> no campo "Servidor"</li>
          <li>Cole a <strong>Stream Key</strong> no campo "Chave de transmissão"</li>
          <li>Clique em <strong>OK</strong> e depois em <strong>Iniciar transmissão</strong></li>
        </ol>
        <p className={styles.obsNote}>
          Outros softwares (Streamlabs, vMix, ffmpeg) seguem o mesmo padrão SRT.
          Consulte a documentação do seu software para o campo equivalente.
        </p>
      </div>
    </div>
  );
}

// ── Progress indicator ────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className={styles.progress}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`${styles.progressDot} ${i < current ? styles.progressDotDone : i === current ? styles.progressDotActive : styles.progressDotIdle}`}
        />
      ))}
    </div>
  );
}

// ── Main tutorial component ───────────────────────────────────────

interface Props {
  eventId: string;
  onClose: () => void;
  onComplete: (stream: StreamResponse) => void;
}

export function StreamSetupTutorial({ eventId, onClose, onComplete }: Props) {
  const [stepIndex, setStepIndex] = useState(0);

  // Form values
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDesc, setStreamDesc] = useState('');
  const [stageName, setStageName] = useState('');
  const [feedName, setFeedName] = useState('');
  const [cameraName, setCameraName] = useState('');

  // Created entity IDs passed between steps
  const [createdStream, setCreatedStream] = useState<StreamResponse | null>(null);
  const [createdStageId, setCreatedStageId] = useState<string | null>(null);
  const [createdFeedId, setCreatedFeedId] = useState<string | null>(null);
  const [createdCameraId, setCreatedCameraId] = useState<string | null>(null);

  // Mutations — IDs provided lazily; steps only mount after prior ID available
  const createStream = useCreateStreamMutation(eventId, (s) => {
    setCreatedStream(s);
    setStepIndex(2);
  });
  const createStage = useCreateStageMutation(createdStream?.id ?? '', () => {});
  const createFeed = useCreateFeedMutation(createdStageId ?? '', () => {});
  const createCamera = useCreateCameraMutation(createdFeedId ?? '', () => {});

  const step = STEPS[stepIndex];
  const visibleSteps = STEPS.slice(1); // welcome excluded from progress bar

  // ── Step actions ────────────────────────────────────────────────

  const handleNext = async () => {
    switch (step.id) {
      case 'welcome':
        setStepIndex(1);
        break;

      case 'stream':
        if (!streamTitle.trim()) return;
        createStream.mutate({
          title: streamTitle.trim(),
          description: streamDesc.trim() || undefined,
        });
        break;

      case 'stage': {
        if (!stageName.trim() || !createdStream) return;
        const stage = await createStage.mutateAsync({ name: stageName.trim() });
        setCreatedStageId(stage.id);
        setStepIndex(3);
        break;
      }

      case 'feed': {
        if (!feedName.trim() || !createdStageId) return;
        const feed = await createFeed.mutateAsync({ name: feedName.trim() });
        setCreatedFeedId(feed.id);
        setStepIndex(4);
        break;
      }

      case 'camera': {
        if (!cameraName.trim() || !createdFeedId) return;
        const cam = await createCamera.mutateAsync({ name: cameraName.trim() });
        setCreatedCameraId(cam.id);
        setStepIndex(5);
        break;
      }

      case 'connect':
        if (createdStream) onComplete(createdStream);
        break;
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const isPending =
    createStream.isPending ||
    createStage.isPending ||
    createFeed.isPending ||
    createCamera.isPending;

  const currentError =
    createStream.error ?? createStage.error ?? createFeed.error ?? createCamera.error;

  const canProceed = (() => {
    switch (step.id) {
      case 'welcome': return true;
      case 'stream': return streamTitle.trim().length > 0;
      case 'stage': return stageName.trim().length > 0;
      case 'feed': return feedName.trim().length > 0;
      case 'camera': return cameraName.trim().length > 0;
      case 'connect': return true;
      default: return false;
    }
  })();

  const nextLabel = (() => {
    if (isPending) return 'Aguarde...';
    switch (step.id) {
      case 'welcome': return 'Começar';
      case 'connect': return 'Abrir minha stream →';
      default: return 'Continuar';
    }
  })();

  const Icon = step.icon;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            {stepIndex > 0 && (
              <button className={styles.backBtn} onClick={handleBack} disabled={isPending}>
                <ArrowLeft size={14} />
              </button>
            )}
            <span className={styles.headerLabel}>TUTORIAL DE STREAM</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Progress (skip welcome step 0) */}
        {stepIndex > 0 && (
          <ProgressBar current={stepIndex} total={visibleSteps.length} />
        )}

        {/* Body */}
        <div className={styles.body}>
          <div className={styles.stepIcon}>
            <Icon size={28} strokeWidth={1.5} />
          </div>
          <h2 className={styles.stepTitle}>{step.title}</h2>
          <p className={styles.stepSubtitle}>{step.subtitle}</p>

          {/* Step-specific content */}
          {step.id === 'welcome' && (
            <div className={styles.welcomeSteps}>
              {visibleSteps.map((s, i) => {
                const SI = s.icon;
                return (
                  <div key={s.id} className={styles.welcomeStep}>
                    <div className={styles.welcomeStepNum}>{i + 1}</div>
                    <SI size={14} className={styles.welcomeStepIcon} />
                    <span className={styles.welcomeStepLabel}>{s.label}</span>
                    {i < visibleSteps.length - 1 && (
                      <ChevronRight size={12} className={styles.welcomeStepArrow} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {step.id === 'stream' && (
            <div className={styles.form}>
              <Field
                label="Título *"
                value={streamTitle}
                onChange={setStreamTitle}
                placeholder="ex: Transmissão Oficial"
              />
              <Field
                label="Descrição"
                value={streamDesc}
                onChange={setStreamDesc}
                placeholder="Descrição opcional"
                multiline
              />
            </div>
          )}

          {step.id === 'stage' && (
            <div className={styles.form}>
              <Field
                label="Nome do palco *"
                value={stageName}
                onChange={setStageName}
                placeholder="ex: Palco Principal"
              />
            </div>
          )}

          {step.id === 'feed' && (
            <div className={styles.form}>
              <Field
                label="Nome do feed *"
                value={feedName}
                onChange={setFeedName}
                placeholder="ex: Câmera Central"
              />
            </div>
          )}

          {step.id === 'camera' && (
            <div className={styles.form}>
              <Field
                label="Nome da câmera *"
                value={cameraName}
                onChange={setCameraName}
                placeholder="ex: CAM 01"
              />
            </div>
          )}

          {step.id === 'connect' && createdCameraId && (
            <ObsInstructions cameraId={createdCameraId} />
          )}

          {currentError && (
            <p className={styles.errorMsg}>
              {(currentError as Error)?.message ?? 'Ocorreu um erro. Tente novamente.'}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.btnNext}
            onClick={handleNext}
            disabled={!canProceed || isPending}
          >
            {nextLabel}
          </button>
          {stepIndex === 0 && (
            <button className={styles.btnSkip} onClick={onClose}>
              Pular tutorial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
