'use client';

import { useState, useEffect, useRef } from 'react';
import { Copy, Check, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useCameraIngestQuery } from '../queries/ingest.queries';
import { useRegenerateCameraKeyMutation } from '../mutations/ingest.mutations';
import styles from './IngestCredentials.module.scss';

interface Props {
  cameraId: string;
}

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shown = secret && !revealed ? '•'.repeat(Math.min(value.length, 24)) : value;

  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return; // clipboard unavailable / denied — leave the icon unchanged
    }
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.fieldRow}>
        <code className={styles.fieldValue}>{shown}</code>
        {secret && (
          <button className={styles.iconBtn} onClick={() => setRevealed((r) => !r)} title={revealed ? 'Ocultar' : 'Revelar'}>
            {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
        <button className={styles.iconBtn} onClick={copy} title="Copiar">
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}

export function IngestCredentials({ cameraId }: Props) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useCameraIngestQuery(cameraId, open);
  const regenerate = useRegenerateCameraKeyMutation(cameraId);

  return (
    <div className={styles.wrap}>
      <button className={styles.toggle} onClick={() => setOpen((o) => !o)}>
        <KeyRound size={12} /> {open ? 'Ocultar credenciais' : 'Credenciais OBS'}
      </button>

      {open && (
        <div className={styles.panel}>
          {isLoading && <p className={styles.muted}>Carregando...</p>}
          {isError && <p className={styles.error}>Falha ao carregar credenciais.</p>}
          {data && (
            <>
              <CopyField label="Servidor (SRT URL)" value={data.ingest.url} />
              <CopyField label="Stream Key" value={data.streamKey} secret />
              <div className={styles.meta}>
                <span>Host: {data.ingest.host}:{data.ingest.port}</span>
                <span>Latência: {data.ingest.latency}ms</span>
              </div>
              <button
                className={styles.regenBtn}
                disabled={regenerate.isPending}
                onClick={() => {
                  if (confirm('Rotacionar a stream key? A key atual deixa de funcionar imediatamente.')) {
                    regenerate.mutate();
                  }
                }}
              >
                {regenerate.isPending ? 'Rotacionando...' : 'Rotacionar key'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
