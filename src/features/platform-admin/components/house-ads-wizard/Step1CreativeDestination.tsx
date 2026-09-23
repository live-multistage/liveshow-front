'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { HouseAdFormat } from '../../house-ads';
import { EventDestinationSearch } from './EventDestinationSearch';
import type { WizardDraft } from './useHouseAdWizardForm';
import { isValidHttpsUrl } from './useHouseAdWizardForm';
import { isVideoFormat, IMAGE_MIME_TYPES, VIDEO_MIME_TYPES } from './upload-limits';
import styles from './HouseAdWizardDialog.module.scss';

const FORMAT_OPTIONS: { value: HouseAdFormat; name: string; spec: string }[] = [
  { value: 'HORIZONTAL_728x90', name: 'Banner 728×90', spec: 'Imagem' },
  { value: 'VERTICAL_300x600', name: 'Banner 300×600', spec: 'Imagem' },
  { value: 'WIDE_16_9', name: 'Imagem 16:9', spec: 'Mín. 1280×720' },
  { value: 'VIDEO_16_9', name: 'Vídeo 16:9', spec: 'MP4 · até 30s' },
];

interface Props {
  draft: WizardDraft;
  update: <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) => void;
  setFormat: (format: HouseAdFormat) => void;
  setCreativeFile: (file: File | null) => void;
}

export function Step1CreativeDestination({ draft, update, setFormat, setCreativeFile }: Props) {
  const accept = draft.format && isVideoFormat(draft.format) ? VIDEO_MIME_TYPES.join(',') : IMAGE_MIME_TYPES.join(',');
  // Step 1 is the first thing an admin sees — unlike later steps, showing
  // "give it a title" before anyone has typed anything is a pristine-load
  // error, not feedback. Gate it on the field having been touched.
  const [titleTouched, setTitleTouched] = useState(false);
  const showTitleError = titleTouched && !draft.title.trim();

  return (
    <>
      <div className={styles.card}>
        <label className={styles.cardHead}>
          <span>TÍTULO</span>
          <span>{draft.title.length} / 80</span>
        </label>
        <input
          className={`${styles.input} ${draft.title.length > 80 ? styles.inputError : ''}`}
          placeholder="Ex.: Festival Rota Sul — ingressos à venda"
          value={draft.title}
          maxLength={80}
          onChange={(e) => {
            setTitleTouched(true);
            update('title', e.target.value);
          }}
          onBlur={() => setTitleTouched(true)}
          aria-label="Título do anúncio"
          aria-invalid={showTitleError}
          aria-describedby={showTitleError ? 'house-ad-title-error' : undefined}
        />
        <p className={styles.hint}>Uso interno e texto alternativo do criativo.</p>
        {showTitleError && (
          <p id="house-ad-title-error" role="alert" className={styles.error}>Dê um título ao anúncio.</p>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span>FORMATO</span></div>
        <div className={styles.formatGrid} role="radiogroup" aria-label="Formato do criativo">
          {FORMAT_OPTIONS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={draft.format === f.value}
              className={`${styles.formatCard} ${draft.format === f.value ? styles.formatCardActive : ''}`}
              onClick={() => setFormat(f.value)}
            >
              <span className={styles.formatName}>{f.name}</span>
              <span className={styles.formatSpec}>{f.spec}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span>CRIATIVO</span></div>
        <div className={styles.dropzone}>
          <div className={styles.dropzoneMeta}>
            {draft.creativeFileName ? (
              <span>{draft.creativeFileName}</span>
            ) : draft.existingCreativeUrl ? (
              <a className={styles.muted} href={draft.existingCreativeUrl} target="_blank" rel="noreferrer">
                Criativo atual (mantido)
              </a>
            ) : (
              <span className={styles.muted}>Nenhum arquivo selecionado.</span>
            )}
          </div>
          <label className={styles.chip} style={{ cursor: 'pointer' }}>
            {draft.creativeFileName ? 'Substituir' : 'Enviar arquivo'}
            <input
              type="file"
              accept={accept}
              style={{ display: 'none' }}
              disabled={!draft.format}
              onChange={(e) => setCreativeFile(e.target.files?.[0] ?? null)}
              aria-label="Selecionar arquivo do criativo"
              aria-invalid={Boolean(draft.creativeError)}
              aria-describedby={draft.creativeError ? 'house-ad-creative-error' : undefined}
            />
          </label>
        </div>
        {draft.creativeError ? (
          <p id="house-ad-creative-error" role="alert" className={styles.error}><AlertCircle size={13} aria-hidden /> {draft.creativeError}</p>
        ) : draft.creativeFileName ? (
          <p className={styles.hint} style={{ color: '#4ade80' }}><CheckCircle2 size={13} aria-hidden /> Arquivo válido</p>
        ) : null}
        <p className={styles.hint}>Imagem PNG, JPG ou WEBP até 2 MB · Vídeo MP4 até 30 s e 50 MB</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span>DESTINO DO CLIQUE</span></div>
        <div className={styles.destinationTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={draft.destinationMode === 'EVENT'}
            className={`${styles.destinationTab} ${draft.destinationMode === 'EVENT' ? styles.destinationTabActive : ''}`}
            onClick={() => update('destinationMode', 'EVENT')}
          >
            Evento da plataforma
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={draft.destinationMode === 'EXTERNAL_URL'}
            className={`${styles.destinationTab} ${draft.destinationMode === 'EXTERNAL_URL' ? styles.destinationTabActive : ''}`}
            onClick={() => update('destinationMode', 'EXTERNAL_URL')}
          >
            Link externo
          </button>
        </div>

        {draft.destinationMode === 'EVENT' ? (
          <EventDestinationSearch
            value={draft.destinationEventId}
            valueTitle={draft.destinationEventTitle}
            onChange={(id, title) => {
              update('destinationEventId', id);
              update('destinationEventTitle', title);
            }}
          />
        ) : (
          <div className={styles.field}>
            <input
              className={`${styles.input} ${draft.destinationUrl && !isValidHttpsUrl(draft.destinationUrl) ? styles.inputError : ''}`}
              placeholder="https://showon.io/..."
              value={draft.destinationUrl}
              onChange={(e) => update('destinationUrl', e.target.value)}
              aria-label="Link externo de destino"
              aria-invalid={Boolean(draft.destinationUrl) && !isValidHttpsUrl(draft.destinationUrl)}
              aria-describedby={draft.destinationUrl && !isValidHttpsUrl(draft.destinationUrl) ? 'house-ad-destination-url-error' : undefined}
            />
            {draft.destinationUrl && !isValidHttpsUrl(draft.destinationUrl) && (
              <p id="house-ad-destination-url-error" role="alert" className={styles.error}>Use um link que comece com https://</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
