'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { SeoGlobal } from '@live-show/api-contracts';
import { Button, Input, Skeleton } from '@live-show/design-system';
import type { AppError } from '@/lib/http/errors';
import { useSeoGlobalQuery, useSetSeoGlobalMutation } from '../queries/use-seo-admin';
import { checkJsonLd } from '../utils/check-jsonld';
import { seoFieldErrors } from '../utils/seo-field-errors';
import { isHttpsUrl } from '../utils/seo-form';
import { MAX_ROBOTS_RULES, robotsRuleError } from '../utils/seo-robots';
import { RobotsRulesEditor } from './RobotsRulesEditor';
import { RootJsonLdFields } from './RootJsonLdFields';
import { SharingSection } from './SharingSection';
import common from './SeoCommon.module.scss';
import styles from './SeoLists.module.scss';

export function GlobalTab() {
  const t = useTranslations('platformAdmin.seo');
  const { data, isLoading, isError, refetch } = useSeoGlobalQuery();

  if (isLoading) return <Skeleton className={styles.skeleton} />;
  if (isError || !data) {
    return (
      <div className={styles.state} role="alert">
        <div className={styles.stateTitle}>{t('loadError')}</div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>{t('retry')}</Button>
      </div>
    );
  }
  return <GlobalForm initial={data} />;
}

const ROOT_VARS = ['site.name', 'site.url'];

function GlobalForm({ initial }: { initial: SeoGlobal }) {
  const t = useTranslations('platformAdmin.seo');
  const save = useSetSeoGlobalMutation();
  const [base, setBase] = useState(initial);
  const [google, setGoogle] = useState(base.googleSiteVerification ?? '');
  const [bing, setBing] = useState(base.bingSiteVerification ?? '');
  const [og, setOg] = useState(base.defaultOgImageUrl ?? '');
  const [org, setOrg] = useState(base.organizationJsonLd ?? '');
  const [site, setSite] = useState(base.websiteJsonLd ?? '');
  const [rules, setRules] = useState(base.robotsExtraRules);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const current = (): SeoGlobal => ({
    googleSiteVerification: google.trim() || null,
    bingSiteVerification: bing.trim() || null,
    defaultOgImageUrl: og.trim() || null,
    organizationJsonLd: org.trim() || null,
    websiteJsonLd: site.trim() || null,
    robotsExtraRules: rules.map((r) => ({ ...r, userAgent: r.userAgent.trim() })),
  });
  const dirty = JSON.stringify(current()) !== JSON.stringify(base);
  const invalid =
    (og !== '' && !isHttpsUrl(og)) ||
    [org, site].some((text) => text !== '' && !checkJsonLd(text, ROOT_VARS).ok) ||
    rules.length > MAX_ROBOTS_RULES ||
    rules.some((r) => robotsRuleError(r) !== null);

  const reset = () => {
    setGoogle(base.googleSiteVerification ?? '');
    setBing(base.bingSiteVerification ?? '');
    setOg(base.defaultOgImageUrl ?? '');
    setOrg(base.organizationJsonLd ?? '');
    setSite(base.websiteJsonLd ?? '');
    setRules(base.robotsExtraRules);
    setErrors({});
    setAttempted(false);
  };

  const submit = async () => {
    if (invalid) return setAttempted(true);
    setSaving(true);
    setErrors({});
    try {
      setBase(await save.mutateAsync(current()));
      toast.success(t('editor.toast.globalSaved'));
    } catch (err) {
      const fieldErrors = seoFieldErrors(err as AppError);
      if ((err as AppError).status === 400 && Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else toast.error(t('editor.toast.error'));
    } finally {
      setSaving(false);
    }
  };

  const unmatched = Object.entries(errors).filter(([field]) => !['defaultOgImageUrl', 'organizationJsonLd', 'websiteJsonLd'].includes(field));

  return (
    <div className={common.stack}>
      <section className={common.card}>
        <div>
          <div className={common.eyebrow}>{t('global.verification.eyebrow')}</div>
          <div className={common.cardTitle}>{t('global.verification.title')}</div>
        </div>
        <div className={common.field}>
          <label className={common.label} htmlFor="seo-gsc">{t('global.verification.google')}</label>
          <Input id="seo-gsc" value={google} onChange={(e) => setGoogle(e.target.value)} />
          <label className={common.label} htmlFor="seo-bing">{t('global.verification.bing')}</label>
          <Input id="seo-bing" value={bing} onChange={(e) => setBing(e.target.value)} />
          <span className={common.hint}>{t('global.verification.help')}</span>
        </div>
      </section>

      <SharingSection value={og} error={errors.defaultOgImageUrl} onChange={setOg} title={t('global.og.title')} eyebrow={t('global.og.eyebrow')} label={t('global.og.url')} help="" />
      <RootJsonLdFields
        values={{ organization: org, website: site }}
        errors={{ organization: errors.organizationJsonLd, website: errors.websiteJsonLd }}
        onChange={(kind, value) => (kind === 'organization' ? setOrg(value) : setSite(value))}
      />
      <RobotsRulesEditor rules={rules} onChange={setRules} showErrors={attempted} />

      {unmatched.map(([field, message]) => <div key={field} role="alert" className={common.alert}>{message}</div>)}

      <div className={common.footer}>
        <span className={common.footerNote} />
        <Button variant="outline" disabled={!dirty || saving} onClick={reset}>{t('editor.footer.cancel')}</Button>
        <Button disabled={!dirty || saving} onClick={submit}>{saving ? t('editor.footer.saving') : t('editor.footer.save')}</Button>
      </div>
    </div>
  );
}
