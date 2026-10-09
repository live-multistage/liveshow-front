'use client';

import { useRef, useState, type DragEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Tabs } from '@live-show/design-system';
import type { AppError } from '@/lib/http/errors';
import { useUploadOgImageMutation } from '../queries/use-seo-admin';
import { OG_IMAGE_MIMES, precheckOgImage } from '../utils/og-image-precheck';
import { isHttpsUrl } from '../utils/seo-form';
import common from './SeoCommon.module.scss';
import styles from './OgImageField.module.scss';

interface Props {
  // Stored value: an https URL as loaded, or the upload key right after an upload.
  value: string;
  // What the <img> loads; differs from `value` right after an upload (the value is then a key).
  previewUrl: string;
  error?: string;
  onChange: (value: string, previewUrl: string) => void;
}

type Source = 'upload' | 'url';

const fileNameOf = (url: string) => decodeURIComponent(url.split('?')[0].split('/').pop() ?? '');

// OG image: Upload (cropped to 1200×630 server-side; the form keeps the returned key) or a plain https URL.
export function OgImageField({ value, previewUrl, error, onChange }: Props) {
  const t = useTranslations('platformAdmin.seo.editor');
  const upload = useUploadOgImageMutation();
  const [source, setSource] = useState<Source>('upload');
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  // Raw text of the URL tab, so half-typed values stay editable (they are never previewable).
  const [url, setUrl] = useState(isHttpsUrl(value) ? value : '');
  const input = useRef<HTMLInputElement>(null);

  const send = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    const rejected = precheckOgImage(file);
    if (rejected) return setUploadError(t(`image.errors.${rejected}`));
    try {
      const saved = await upload.mutateAsync(file);
      setFileName(file.name);
      onChange(saved.key, saved.url);
    } catch (err) {
      const { status, message } = err as AppError;
      setUploadError(status === 400 && message ? message : t('image.errors.generic'));
    }
  };

  const drop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void send(e.dataTransfer.files[0]);
  };

  const remove = () => {
    setFileName(null);
    setUploadError(null);
    setUrl('');
    onChange('', '');
  };

  const urlInvalid = source === 'url' && url !== '' && !isHttpsUrl(url);
  const message = error ?? uploadError ?? (urlInvalid ? t('image.invalidUrl') : undefined);
  const image = previewUrl || (isHttpsUrl(value) ? value : '');

  const thumb = image && (
    <div className={styles.thumb}>
      <img src={image} alt={t('image.thumb')} className={styles.image} />
      <span className={styles.size}>1200 × 630</span>
    </div>
  );

  return (
    <div className={common.field}>
      <span className={common.label}>{t('og.imageLabel')}</span>
      <Tabs
        label={t('image.tabs')}
        items={[{ value: 'upload', label: t('image.upload') }, { value: 'url', label: t('image.url') }]}
        value={source}
        onValueChange={(v) => setSource(v as Source)}
      >
        <div className={styles.panel}>
          <input
            ref={input}
            type="file"
            hidden
            accept={OG_IMAGE_MIMES.join(',')}
            aria-label={t('image.fileInput')}
            onChange={(e) => { void send(e.target.files?.[0]); e.target.value = ''; }}
          />
          {source === 'upload' && upload.isPending && (
            <div className={styles.progress} role="progressbar" aria-label={t('image.uploading')}>
              <span className={styles.bar} />
              <span className={common.hint}>{t('image.uploading')}</span>
            </div>
          )}
          {source === 'upload' && !upload.isPending && value === '' && (
            <div
              className={styles.drop}
              data-active={dragging}
              data-error={uploadError !== null}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={drop}
            >
              <div className={styles.dropRow}>
                <Button variant="outline" size="sm" onClick={() => input.current?.click()}>{t('image.choose')}</Button>
                <span className={common.hint}>{t('image.drop')}</span>
              </div>
              <span className={common.hint}>{t('image.hint')}</span>
            </div>
          )}
          {source === 'upload' && !upload.isPending && value !== '' && (
            <div className={styles.current}>
              <span className={common.eyebrow}>{t('image.current')}</span>
              {thumb}
              <div className={styles.currentRow}>
                <span className={styles.fileName}>{fileName ?? fileNameOf(image || value)}</span>
                <Button variant="outline" size="sm" onClick={() => input.current?.click()}>{t('image.replace')}</Button>
                <Button variant="outline" size="sm" onClick={remove}>{t('image.remove')}</Button>
              </div>
            </div>
          )}
          {source === 'url' && (
            <>
              <Input
                aria-label={t('image.urlLabel')}
                value={url}
                placeholder="https://"
                aria-invalid={message ? true : undefined}
                onChange={(e) => { setUrl(e.target.value); onChange(e.target.value, ''); }}
              />
              <span className={common.hint}>{t('image.urlHint')}</span>
              {thumb}
            </>
          )}
          {value === '' && <span className={common.hint}>{t('image.empty')}</span>}
          {message && <p role="alert" className={common.error}>{message}</p>}
        </div>
      </Tabs>
    </div>
  );
}
