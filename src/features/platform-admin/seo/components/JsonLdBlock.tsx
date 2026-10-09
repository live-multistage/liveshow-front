'use client';

import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Textarea } from '@live-show/design-system';
import type { JsonLdCheck } from '../utils/check-jsonld';
import { normalizeJsonLd } from '../utils/seo-form';
import { useJsonLdStatusText } from './use-jsonld-status';
import common from './SeoCommon.module.scss';
import styles from './JsonLdBlock.module.scss';

interface Props {
  n: number;
  text: string;
  check: JsonLdCheck;
  serverError?: string;
  onChange: (text: string) => void;
  onFormat: () => void;
  onRemove: () => void;
}

// One extra JSON-LD block: mono editor, live local check, and the API's own verdict when it rejects it.
export function JsonLdBlock({ n, text, check, serverError, onChange, onFormat, onRemove }: Props) {
  const t = useTranslations('platformAdmin.seo.editor.jsonld');
  const statusText = useJsonLdStatusText();

  // Paste/blur: drop a pasted <script> wrapper and pretty-print when it parses.
  const normalize = (raw: string) => {
    const next = normalizeJsonLd(raw);
    if (next.stripped) toast.info(t('scriptRemoved'));
    if (next.text !== text) onChange(next.text);
  };

  return (
    <div className={styles.block} data-block={n}>
      <div className={styles.head}>
        <span className={common.eyebrow}>{t('block', { n })}</span>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" disabled={'reason' in check && check.reason === 'json'} onClick={onFormat}>{t('format')}</Button>
          <Button variant="outline" size="sm" aria-label={t('remove', { n })} onClick={onRemove}><Trash2 size={13} /></Button>
        </div>
      </div>
      <Textarea
        mono
        rows={10}
        spellCheck={false}
        wrap="off"
        aria-label={t('blockLabel', { n })}
        value={text}
        error={serverError}
        onChange={(e) => onChange(e.target.value)}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData('text');
          if (!pasted) return;
          e.preventDefault();
          const { selectionStart, selectionEnd } = e.currentTarget;
          normalize(text.slice(0, selectionStart) + pasted + text.slice(selectionEnd));
        }}
        onBlur={() => text.trim() && normalize(text)}
      />
      <div className={styles.status} data-ok={check.ok}>
        <span className={styles.dot} />
        {statusText(check)}
        {serverError && <span className={styles.server}>{t('server')}</span>}
      </div>
    </div>
  );
}
