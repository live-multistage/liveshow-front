'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Switch, Textarea } from '@live-show/design-system';
import {
  PAGE_LIMITS,
  pageHttpsUrlSchema,
  pageSlugError,
  type PageDetail,
  type UpdatePageSettingsRequest,
} from '@live-show/api-contracts';
import {
  useArchivePageMutation,
  useUnarchivePageMutation,
  useUnpublishPageMutation,
  useUpdatePageSettingsMutation,
} from '../mutations/use-page-mutations';
import { PageDrawer } from './PageDrawer';
import styles from './PageDrawers.module.scss';

interface Props {
  page: PageDetail;
  onClose(): void;
}

type FieldErrors = Partial<Record<'title' | 'slug' | 'imageUrl' | 'form', string>>;

export function PageSettingsDrawer({ page, onClose }: Props) {
  const t = useTranslations('platformAdmin.pageEditor.settings');
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [seoTitle, setSeoTitle] = useState(page.seo.title ?? '');
  const [seoDescription, setSeoDescription] = useState(page.seo.description ?? '');
  const [imageUrl, setImageUrl] = useState(page.seo.imageUrl ?? '');
  const [noindex, setNoindex] = useState(page.seo.noindex);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirming, setConfirming] = useState<'unpublish' | 'archive' | null>(null);

  const update = useUpdatePageSettingsMutation(page.id);
  const unpublish = useUnpublishPageMutation(page.id);
  const archive = useArchivePageMutation(page.id);
  const unarchive = useUnarchivePageMutation(page.id);
  const busy = update.isPending || unpublish.isPending || archive.isPending || unarchive.isPending;

  const seoChanged =
    seoTitle !== (page.seo.title ?? '') || seoDescription !== (page.seo.description ?? '') ||
    imageUrl !== (page.seo.imageUrl ?? '') || noindex !== page.seo.noindex;
  const changes: UpdatePageSettingsRequest = {
    ...(title.trim() !== page.title && { title: title.trim() }),
    ...(slug !== page.slug && { slug }),
    ...(seoChanged && {
      seo: {
        ...(seoTitle.trim() && { title: seoTitle.trim() }),
        ...(seoDescription.trim() && { description: seoDescription.trim() }),
        ...(imageUrl.trim() && { imageUrl: imageUrl.trim() }),
        noindex,
      },
    }),
  };
  const hasChanges = Object.keys(changes).length > 0;

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (changes.title !== undefined && !changes.title) next.title = t('required');
    if (changes.slug !== undefined) {
      const slugError = pageSlugError(changes.slug);
      if (slugError) next.slug = t(slugError === 'reserved' ? 'slugReserved' : 'slugFormat');
    }
    if (changes.seo?.imageUrl && !pageHttpsUrlSchema.safeParse(changes.seo.imageUrl).success) next.imageUrl = t('imageInvalid');
    return next;
  };

  const save = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await update.mutateAsync(changes);
      onClose();
    } catch (error) {
      const status = (error as { status?: number }).status;
      setErrors(status === 409 && changes.slug !== undefined ? { slug: t('slugInUse') } : { form: t('error') });
    }
  };

  const lifecycle = async (action: { mutateAsync(): Promise<unknown> }) => {
    setConfirming(null);
    try {
      await action.mutateAsync();
      onClose();
    } catch {
      setErrors({ form: t('error') });
    }
  };

  const footer = (
    <>
      <Button type="button" variant="outline" onClick={onClose}>{t('cancel')}</Button>
      <Button type="button" disabled={!hasChanges || busy} onClick={() => void save()}>{update.isPending ? t('saving') : t('save')}</Button>
    </>
  );

  return (
    <PageDrawer label={t('label')} heading={t('heading')} closeLabel={t('close')} onClose={onClose} footer={footer}>
      <div className={styles.group}>{t('general')}</div>
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <Label htmlFor="page-title">{t('title')}</Label>
          <span className={styles.count}>{title.length}/{PAGE_LIMITS.titleMax}</span>
        </div>
        <Input id="page-title" value={title} maxLength={PAGE_LIMITS.titleMax} aria-invalid={!!errors.title || undefined} onChange={(e) => setTitle(e.target.value)} />
        {errors.title && <p className={styles.error} role="alert">{errors.title}</p>}
      </div>
      <div className={styles.field}>
        <Label htmlFor="page-slug">{t('address')}</Label>
        <div className={styles.prefix}>
          <span>{t('addressPrefix')}</span>
          <Input id="page-slug" value={slug} maxLength={PAGE_LIMITS.slugMax} aria-invalid={!!errors.slug || undefined} onChange={(e) => setSlug(e.target.value)} />
        </div>
        {errors.slug && <p className={styles.error} role="alert">{errors.slug}</p>}
        {page.status === 'PUBLISHED' && <span className={styles.warnHint}>{t('addressPublishedWarning')}</span>}
      </div>

      <div className={styles.group}>{t('seo')}</div>
      <div className={styles.field}>
        <div className={styles.labelRow}>
          <Label htmlFor="seo-title">{t('seoTitle')}</Label>
          <span className={styles.count}>{seoTitle.length}/{PAGE_LIMITS.seoTitleMax}</span>
        </div>
        <Input id="seo-title" value={seoTitle} maxLength={PAGE_LIMITS.seoTitleMax} onChange={(e) => setSeoTitle(e.target.value)} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="seo-description">{t('seoDescription')}</Label>
        <Textarea id="seo-description" rows={3} max={PAGE_LIMITS.seoDescriptionMax} maxLength={PAGE_LIMITS.seoDescriptionMax}
          value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
      </div>
      <div className={styles.field}>
        <Label htmlFor="seo-image">{t('seoImage')}</Label>
        <Input id="seo-image" type="url" inputMode="url" value={imageUrl} maxLength={PAGE_LIMITS.urlMax} placeholder="https://"
          aria-invalid={!!errors.imageUrl || undefined} onChange={(e) => setImageUrl(e.target.value)} />
        {errors.imageUrl && <p className={styles.error} role="alert">{errors.imageUrl}</p>}
      </div>
      <div className={styles.switchRow}>
        <span id="noindex-label">{t('noindex')}</span>
        <Switch checked={noindex} onCheckedChange={setNoindex} aria-labelledby="noindex-label" />
      </div>

      {errors.form && <p className={styles.error} role="alert">{errors.form}</p>}

      <div className={`${styles.group} ${styles.danger}`}>{t('dangerZone')}</div>
      <div className={`${styles.card} ${styles.dangerCard}`}>
        {page.status === 'PUBLISHED' && (
          <div className={styles.cardRow}>
            <div><b>{t('unpublish')}</b><div className={styles.hint}>{t('unpublishHint')}</div></div>
            <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => setConfirming('unpublish')}>{t('unpublish')}</Button>
          </div>
        )}
        {page.status === 'ARCHIVED' ? (
          <div className={styles.cardRow}>
            <div><b>{t('unarchive')}</b><div className={styles.hint}>{t('unarchiveHint')}</div></div>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void lifecycle(unarchive)}>{t('unarchive')}</Button>
          </div>
        ) : (
          <div className={styles.cardRow}>
            <div><b>{t('archive')}</b><div className={styles.hint}>{t('archiveHint')}</div></div>
            <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => setConfirming('archive')}>{t('archive')}</Button>
          </div>
        )}
      </div>
      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent role="alertdialog">
          <DialogHeader>
            <DialogTitle>{confirming && t(`${confirming}ConfirmTitle`)}</DialogTitle>
            <DialogDescription>{confirming && t(`${confirming}ConfirmText`)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(null)}>{t('cancel')}</Button>
            <Button type="button" variant="destructive" onClick={() => void lifecycle(confirming === 'archive' ? archive : unpublish)}>
              {confirming && t(confirming)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageDrawer>
  );
}
