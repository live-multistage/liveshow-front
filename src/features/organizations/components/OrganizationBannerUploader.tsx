'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import styles from './OrganizationBannerUploader.module.scss';

interface Props {
  currentUrl?: string;
  onUpload: (file: File) => void;
  isPending?: boolean;
}

export function OrganizationBannerUploader({ currentUrl, onUpload, isPending }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    onUpload(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const src = preview ?? currentUrl;

  return (
    <div className={styles.uploader}>
      <p className={styles.label}>Banner</p>
      <div
        className={styles.dropzone}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {src ? (
          <div className={styles.previewWrapper}>
            <img src={src} alt="Banner" className={styles.preview} />
            <button
              className={styles.clearBtn}
              onClick={(e) => { e.stopPropagation(); setPreview(null); }}
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <Upload size={20} />
            <span>Clique ou arraste para enviar</span>
            <span className={styles.hint}>PNG, JPG — máx 5MB — recomendado 1200×400px</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.hidden}
        onChange={handleChange}
        disabled={isPending}
      />
    </div>
  );
}
