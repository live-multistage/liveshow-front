'use client';

import { useTranslations } from 'next-intl';
import { Button, Textarea } from '@live-show/design-system';
import { checkJsonLd } from '../utils/check-jsonld';
import { formatJson } from '../utils/seo-form';
import { useJsonLdStatusText } from './use-jsonld-status';
import common from './SeoCommon.module.scss';
import styles from './RootJsonLdFields.module.scss';

const ROOT_VARS = ['site.name', 'site.url'];

// Starting points for "Personalizar": the real code defaults are built at render time, so these are generic.
const STARTERS = {
  organization: formatJson('{"@context":"https://schema.org","@type":"Organization","name":"{{site.name}}","url":"{{site.url}}"}'),
  website: formatJson('{"@context":"https://schema.org","@type":"WebSite","name":"{{site.name}}","url":"{{site.url}}"}'),
};

type RootKind = keyof typeof STARTERS;

interface Props {
  values: Record<RootKind, string>;
  errors: Record<RootKind, string | undefined>;
  onChange: (kind: RootKind, value: string) => void;
}

export function RootJsonLdFields({ values, errors, onChange }: Props) {
  const t = useTranslations('platformAdmin.seo.global.root');
  const statusText = useJsonLdStatusText();

  return (
    <section className={common.card}>
      <div>
        <div className={common.eyebrow}>{t('eyebrow')}</div>
        <div className={common.cardTitle}>{t('title')}</div>
        <p className={common.cardHelp}>{t('help')}</p>
      </div>
      {(Object.keys(STARTERS) as RootKind[]).map((kind) => {
        const text = values[kind];
        const check = checkJsonLd(text, ROOT_VARS);
        return (
          <div key={kind} className={styles.block}>
            <div className={styles.head}>
              <span className={styles.type}>{t(kind)}</span>
              {text === '' ? (
                <Button variant="outline" size="sm" onClick={() => onChange(kind, STARTERS[kind])}>{t('customize')}</Button>
              ) : (
                <div className={styles.actions}>
                  <span className={styles.badge}>{t('custom')}</span>
                  <Button variant="outline" size="sm" disabled={'reason' in check && check.reason === 'json'} onClick={() => onChange(kind, formatJson(text))}>{t('format')}</Button>
                  <Button variant="outline" size="sm" onClick={() => onChange(kind, '')}>{t('reset')}</Button>
                </div>
              )}
            </div>
            {text === '' ? (
              <div className={common.hint}>{t('usingDefault')}</div>
            ) : (
              <>
                <Textarea mono rows={8} spellCheck={false} wrap="off" aria-label={t('label', { type: t(kind) })} value={text} error={errors[kind]} onChange={(e) => onChange(kind, e.target.value)} />
                <div className={styles.status} data-ok={check.ok}><span className={styles.dot} />{statusText(check)}</div>
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
