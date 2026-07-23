'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Film, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useVodAsset, vodAssetKey } from '../../hooks/useVodAsset';
import { requestVodUpload, uploadVodSourceDirect, uploadVodSourceToS3, completeVodUpload } from '../../services/vod.service';
import styles from './VodUploadCard.module.scss';

type Phase = 'idle' | 'requesting' | 'uploading' | 'completing';

interface Props {
  eventId: string;
}

export function VodUploadCard({ eventId }: Props) {
  const t = useTranslations('eventDetail');
  const queryClient = useQueryClient();
  const { data: asset, isLoading } = useVodAsset(eventId);

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function startUpload(file: File) {
    setError(null);
    setProgress(0);
    try {
      setPhase('requesting');
      const { uploadUrl } = await requestVodUpload(eventId);

      setPhase('uploading');
      if (uploadUrl) {
        await uploadVodSourceToS3(uploadUrl, file, setProgress);
      } else {
        await uploadVodSourceDirect(eventId, file, setProgress);
      }

      setPhase('completing');
      const updated = await completeVodUpload(eventId);
      queryClient.setQueryData(vodAssetKey(eventId), updated);
      setPhase('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload');
      setPhase('idle');
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) startUpload(file);
  }

  const busy = phase !== 'idle';

  return (
    <div className={styles.card}>
      <p className={styles.title}><Film size={14} /> {t('vodTitle')}</p>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4"
        className={styles.hiddenInput}
        onChange={handleFile}
      />

      {isLoading ? (
        <span className={styles.spinner} />
      ) : busy ? (
        <div className={styles.progressState}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className={styles.hint}>
            {phase === 'requesting' && 'Preparando upload…'}
            {phase === 'uploading' && `Enviando… ${Math.round(progress * 100)}%`}
            {phase === 'completing' && 'Finalizando…'}
          </p>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p className={styles.errorMessage}><AlertTriangle size={14} /> {error}</p>
          <button type="button" className={styles.btn} onClick={() => inputRef.current?.click()}>
            Tentar novamente
          </button>
        </div>
      ) : !asset || asset.status === 'AWAITING_UPLOAD' ? (
        <button type="button" className={styles.uploadZone} onClick={() => inputRef.current?.click()}>
          <UploadCloud size={20} />
          <span>{t('vodSend')}</span>
          <span className={styles.hint}>{t('vodHint')}</span>
        </button>
      ) : asset.status === 'UPLOADED' || asset.status === 'PROCESSING' ? (
        <div className={styles.progressState}>
          <span className={styles.spinner} />
          <p className={styles.hint}>Processando…</p>
        </div>
      ) : asset.status === 'READY' ? (
        <p className={styles.readyState}><CheckCircle2 size={16} /> {t('vodReady')}</p>
      ) : (
        <div className={styles.errorState}>
          <p className={styles.errorMessage}><AlertTriangle size={14} /> {asset.error ?? t('vodError')}</p>
          <button type="button" className={styles.btn} onClick={() => inputRef.current?.click()}>
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
