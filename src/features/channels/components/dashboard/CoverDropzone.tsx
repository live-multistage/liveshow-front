'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus } from 'lucide-react';
import { COVER_MIME_TYPES } from '../../hooks/useCreateChannelForm';
import styles from './CreateChannelForm.module.scss';

interface Props {
  file: File | null;
  error: string | null;
  onChange: (file: File | null) => void;
}

export function CoverDropzone({ file, error, onChange }: Props) {
  const t = useTranslations('channels.create');
  const [dragging, setDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className={styles.field}>
      <span className={styles.label}>
        {t('coverLabel')} <span className={styles.optional}>({t('descriptionOptional')})</span>
      </span>

      {file ? (
        <div className={styles.coverPreview}>
          {previewUrl && (
            // `next/image` não serve aqui: a origem é um blob: local que ainda
            // não foi enviado, então não há nada para o otimizador buscar.
            <img className={styles.coverImage} src={previewUrl} alt={file.name} />
          )}
          <button type="button" className={styles.coverRemove} onClick={() => onChange(null)}>
            {t('coverRemove')}
          </button>
        </div>
      ) : (
        <label
          className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            onChange(event.dataTransfer.files?.[0] ?? null);
          }}
        >
          <input
            id="channel-cover"
            className={styles.dropzoneInput}
            type="file"
            accept={COVER_MIME_TYPES}
            onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          />
          <ImagePlus size={22} aria-hidden="true" />
          <span className={styles.dropzoneCta}>{t('coverCta')}</span>
          <span className={styles.dropzoneHint}>{t('coverHint')}</span>
        </label>
      )}

      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : (
        <span className={styles.help}>{t('coverHelp')}</span>
      )}
    </div>
  );
}
