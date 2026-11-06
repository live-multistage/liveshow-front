'use client';

import { useRef, useState, type Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Switch } from '@live-show/design-system';
import {
  PAGE_LIMITS as L,
  PAGE_RAIL_LIMITS,
  PAGE_RAIL_SOURCES,
  PAGE_SECTION_BACKGROUNDS,
  PAGE_SECTION_SHOW_ON,
  PAGE_SECTION_SPACINGS,
  MAILING_EVENT_CATEGORIES,
  type PageRailLimit,
  type PageRailSourceKind,
  type PageSection,
} from '@live-show/api-contracts';
import { Copy, Eye, Trash2 } from 'lucide-react';
import type { PageEditorAction, SectionIssue } from '../hooks/page-editor-reducer';
import { itemsFitLines, itemsToLines, linesToItems } from '../utils/lines-to-items';
import { parseTextRuns, serializeTextRuns } from '../utils/text-runs';
import { ArtistPicker } from '../../mailing/components/ArtistPicker';
import { EventPicker } from '../../mailing/components/EventPicker';
import { OrganizationPicker } from '../../mailing/components/OrganizationPicker';
import { CtaFields, Field, ImageUpload, ParsedTextField, Segment, TextField, issueFor } from './InspectorFields';
import styles from './SectionInspector.module.scss';

interface Props {
  section: PageSection;
  index: number;
  issues: SectionIssue[];
  locked: boolean;
  /** The page is at its section limit: duplicating is off. */
  full?: boolean;
  dispatch: Dispatch<PageEditorAction>;
}

const optional = (value: string): string | undefined => (value === '' ? undefined : value);

export function SectionInspector({ section, index, issues, locked, full = false, dispatch }: Props) {
  const t = useTranslations('platformAdmin.pageEditor');
  const tCategory = useTranslations('platformAdmin.mailing.audience.eventCategory');
  const set = (props: Record<string, unknown>) => dispatch({ type: 'updateProps', id: section.id, props });
  const err = (...paths: string[]) => issueFor(issues, ...paths)?.message;
  // List fields: point at the offending line ("items.2.title" → item 3).
  const listErr = (path: string) => {
    const issue = issueFor(issues, path);
    const line = issue && new RegExp(`^${path}\\.(\\d+)\\.`).exec(issue.path);
    return issue && (line ? t('inspector.itemError', { n: Number(line[1]) + 1, message: issue.message }) : issue.message);
  };
  const typeName = t(`sectionTypes.${section.type}`);
  const id = (name: string) => `${section.id}-${name}`;
  const label = (key: string, values?: Record<string, string | number>) => t(`inspector.field.${key}`, values);

  const content = (() => {
    switch (section.type) {
      case 'hero': {
        const p = section.props;
        return (
          <>
            <TextField id={id('eyebrow')} label={label('eyebrow')} max={L.eyebrowMax} value={p.eyebrow ?? ''} error={err('eyebrow')}
              onChange={(v) => set({ eyebrow: optional(v) })} />
            <TextField id={id('title')} label={label('title')} max={L.headingMax} required multiline value={p.title} error={err('title')}
              onChange={(title) => set({ title })} />
            <TextField id={id('subtitle')} label={label('subtitle')} max={200} multiline value={p.subtitle ?? ''} error={err('subtitle')}
              onChange={(v) => set({ subtitle: optional(v) })} />
            <CtaFields id={id('primary')} labelText={label('primaryCtaLabel')} hrefText={label('primaryCtaHref')} value={p.primaryCta}
              labelError={err('primaryCta.label')} hrefError={err('primaryCta.href')} onChange={(primaryCta) => set({ primaryCta })} />
            <CtaFields id={id('secondary')} labelText={label('secondaryCtaLabel')} hrefText={label('secondaryCtaHref')} value={p.secondaryCta}
              labelError={err('secondaryCta.label')} hrefError={err('secondaryCta.href')} onChange={(secondaryCta) => set({ secondaryCta })} />
            <ImagePair urlId={id('image-url')} altId={id('image-alt')} url={p.image?.url ?? ''} alt={p.image?.alt ?? ''}
              urlLabel={label('imageUrl')} altLabel={label('imageAlt')} urlError={err('image.url')} altError={err('image.alt')}
              onChange={(image) => set({ image })} />
          </>
        );
      }
      case 'audience': {
        const p = section.props;
        return (
          <>
            <TextField id={id('text')} label={label('text')} max={L.headingMax} required value={p.text} error={err('text')}
              onChange={(text) => set({ text })} />
            <CounterPairs idFor={id} p={p} label={label} err={err} set={set} />
          </>
        );
      }
      case 'text': {
        const p = section.props;
        return (
          <>
            <TextField id={id('title')} label={label('title')} max={L.headingMax} value={p.title ?? ''} error={err('title')}
              onChange={(v) => set({ title: optional(v) })} />
            <ParsedTextField id={id('body')} label={label('body')} required rows={8} counter={L.textMax} hint={t('inspector.textHint')}
              initial={serializeTextRuns(p.paragraphs)} error={err('paragraphs')} onText={(text) => set({ paragraphs: parseTextRuns(text) })} />
          </>
        );
      }
      case 'features': {
        const p = section.props;
        return (
          <>
            <TextField id={id('title')} label={label('title')} max={L.headingMax} required value={p.title} error={err('title')}
              onChange={(title) => set({ title })} />
            <ParsedTextField id={id('items')} label={label('features')} hint={t('inspector.listHint')} initial={itemsToLines(p.items, ['title', 'text'])}
              readOnlyWarning={itemsFitLines(p.items, ['title', 'text']) ? undefined : t('inspector.listUnsafe')}
              error={listErr('items')} onText={(text) => set({ items: linesToItems(text, ['title', 'text'], p.items) })} />
          </>
        );
      }
      case 'how': {
        const p = section.props;
        return (
          <>
            <TextField id={id('eyebrow')} label={label('eyebrow')} max={L.eyebrowMax} value={p.eyebrow ?? ''} error={err('eyebrow')}
              onChange={(v) => set({ eyebrow: optional(v) })} />
            <TextField id={id('title')} label={label('title')} max={L.headingMax} required value={p.title} error={err('title')}
              onChange={(title) => set({ title })} />
            <ParsedTextField id={id('steps')} label={label('steps')} hint={t('inspector.listHint')} initial={itemsToLines(p.steps, ['title', 'text'])}
              readOnlyWarning={itemsFitLines(p.steps, ['title', 'text']) ? undefined : t('inspector.listUnsafe')}
              error={listErr('steps')} onText={(text) => set({ steps: linesToItems(text, ['title', 'text'], p.steps) })} />
          </>
        );
      }
      case 'media': {
        const p = section.props;
        return (
          <>
            <Segment label={label('mediaKind')} value={p.kind} onChange={(kind) => set({ kind })}
              options={[{ value: 'image', label: label('mediaImage') }, { value: 'video', label: label('mediaVideo') }]} />
            <TextField id={id('url')} label={label('mediaUrl')} max={L.urlMax} required value={p.url} error={err('url')}
              onChange={(url) => set({ url })} />
            {p.kind === 'image' && <ImageUpload onUploaded={(url) => set({ url })} />}
            <TextField id={id('alt')} label={label('alt')} max={L.altMax} required value={p.alt} error={err('alt')}
              onChange={(alt) => set({ alt })} />
            <TextField id={id('caption')} label={label('caption')} max={L.captionMax} value={p.caption ?? ''} error={err('caption')}
              onChange={(v) => set({ caption: optional(v) })} />
          </>
        );
      }
      case 'stats': {
        const p = section.props;
        return (
          <>
            <TextField id={id('title')} label={label('title')} max={L.headingMax} value={p.title ?? ''} error={err('title')}
              onChange={(v) => set({ title: optional(v) })} />
            <ParsedTextField id={id('items')} label={label('stats')} hint={t('inspector.listHint')} initial={itemsToLines(p.items, ['value', 'label'])}
              readOnlyWarning={itemsFitLines(p.items, ['value', 'label']) ? undefined : t('inspector.listUnsafe')}
              error={listErr('items')} onText={(text) => set({ items: linesToItems(text, ['value', 'label'], p.items) })} />
          </>
        );
      }
      case 'rail': {
        const p = section.props;
        const { kind, id: sourceId } = p.source;
        const setKind = (next: PageRailSourceKind) =>
          set({ source: next === 'live' ? { kind: 'live' } : { kind: next, id: next === kind ? sourceId : undefined } });
        const setSourceId = (value: string | undefined) => set({ source: { kind, id: value } });
        return (
          <>
            <TextField id={id('title')} label={label('title')} max={L.railTitleMax} required value={p.title} error={err('title')}
              onChange={(title) => set({ title })} />
            <Segment label={label('railSource')} value={kind} onChange={setKind}
              options={PAGE_RAIL_SOURCES.map((value) => ({ value, label: t(`railSource.${value}`) }))} />
            {kind === 'category' && (
              <Field id={id('category')} label={label('railCategory')} required error={err('source')}>
                <select id={id('category')} className={styles.select} value={sourceId ?? ''} onChange={(e) => setSourceId(optional(e.target.value))}>
                  <option value="" />
                  {MAILING_EVENT_CATEGORIES.map((value) => (
                    <option key={value} value={value}>{tCategory(value)}</option>
                  ))}
                </select>
              </Field>
            )}
            {kind === 'organization' && <OrganizationPicker label={label('railOrganization')} value={sourceId} onChange={setSourceId} />}
            {kind === 'artist' && <ArtistPicker label={label('railArtist')} value={sourceId} onChange={setSourceId} />}
            {(kind === 'organization' || kind === 'artist') && err('source') && <p className={styles.error}>{err('source')}</p>}
            <Segment label={label('railLimit')} value={String(p.limit)} onChange={(v) => set({ limit: Number(v) as PageRailLimit })}
              options={PAGE_RAIL_LIMITS.map((value) => ({ value: String(value), label: String(value) }))} />
          </>
        );
      }
      case 'featured': {
        const p = section.props;
        return (
          <>
            <EventPicker featurable value={p.eventId ? [p.eventId] : []} max={1} onChange={(ids) => set({ eventId: ids[0] ?? '' })} />
            {err('eventId') && <p className={styles.error}>{err('eventId')}</p>}
            <TextField id={id('cta')} label={label('ctaLabel')} max={L.ctaLabelMax} value={p.ctaLabel ?? ''} error={err('ctaLabel')}
              onChange={(v) => set({ ctaLabel: optional(v) })} />
          </>
        );
      }
      case 'pricing': {
        const p = section.props;
        return (
          <>
            <TextField id={id('title')} label={label('title')} max={L.headingMax} required value={p.title} error={err('title')}
              onChange={(title) => set({ title })} />
            <ParsedTextField id={id('plans')} label={label('plans')} hint={t('inspector.listHint')} initial={itemsToLines(p.plans, ['name', 'price'])}
              readOnlyWarning={itemsFitLines(p.plans, ['name', 'price']) ? undefined : t('inspector.listUnsafe')}
              error={listErr('plans')} onText={(text) => set({ plans: linesToItems(text, ['name', 'price'], p.plans) })} />
          </>
        );
      }
      case 'faq': {
        const p = section.props;
        return (
          <>
            <TextField id={id('title')} label={label('title')} max={L.headingMax} required value={p.title} error={err('title')}
              onChange={(title) => set({ title })} />
            <ParsedTextField id={id('items')} label={label('faq')} hint={t('inspector.listHint')} initial={itemsToLines(p.items, ['question', 'answer'])}
              readOnlyWarning={itemsFitLines(p.items, ['question', 'answer']) ? undefined : t('inspector.listUnsafe')}
              error={listErr('items')} onText={(text) => set({ items: linesToItems(text, ['question', 'answer'], p.items) })} />
          </>
        );
      }
      case 'final': {
        const p = section.props;
        return (
          <>
            <TextField id={id('title')} label={label('title')} max={L.headingMax} required multiline value={p.title} error={err('title')}
              onChange={(title) => set({ title })} />
            <TextField id={id('cta-label')} label={label('ctaLabel')} max={L.ctaLabelMax} required value={p.cta.label} error={err('cta.label')}
              onChange={(text) => set({ cta: { ...p.cta, label: text } })} />
            <TextField id={id('cta-href')} label={label('ctaHref')} max={L.urlMax} required value={p.cta.href} error={err('cta.href')}
              onChange={(href) => set({ cta: { ...p.cta, href } })} />
          </>
        );
      }
    }
  })();

  const appearance = (key: 'background' | 'spacing' | 'showOn', values: readonly string[]) => (
    <Segment label={t(`inspector.${key}.label`)}
      value={section.appearance[key]} options={values.map((value) => ({ value, label: t(`inspector.${key}.${value}`) }))}
      onChange={(value) => dispatch({ type: 'updateAppearance', id: section.id, appearance: { [key]: value } })} />
  );

  return (
    <div className={styles.inspector} data-testid="inspector-slot" data-selected-id={section.id}>
      <div className={styles.header}>
        <span>{t('inspector.heading', { name: typeName, index: String(index + 1).padStart(2, '0') })}</span>
        <Button type="button" variant="ghost" size="icon" className={styles.headerAction} disabled={locked || full}
          aria-label={t('tree.duplicate', { name: typeName })}
          onClick={() => dispatch({ type: 'duplicate', id: section.id, newId: crypto.randomUUID() })}>
          <Copy aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className={styles.headerAction} disabled={locked}
          aria-label={t('tree.remove', { name: typeName })} onClick={() => dispatch({ type: 'remove', id: section.id })}>
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      {section.hidden && (
        <div className={styles.notice}>
          <Eye aria-hidden="true" />
          <span>{t('inspector.hiddenNotice')}</span>
          <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => dispatch({ type: 'toggleHidden', id: section.id })}>
            {t('inspector.show')}
          </Button>
        </div>
      )}
      <fieldset className={styles.body} disabled={locked}>
        <div className={styles.group}>{t('inspector.content')}</div>
        {content}
        <div className={styles.group}>{t('inspector.appearance')}</div>
        {appearance('background', PAGE_SECTION_BACKGROUNDS)}
        {appearance('spacing', PAGE_SECTION_SPACINGS)}
        <div className={styles.group}>{t('inspector.visibility')}</div>
        {appearance('showOn', PAGE_SECTION_SHOW_ON)}
        <div className={styles.switchRow}>
          <span id={id('visible')}>{t('inspector.visible')}</span>
          <Switch aria-labelledby={id('visible')} checked={!section.hidden} onCheckedChange={() => dispatch({ type: 'toggleHidden', id: section.id })} />
        </div>
      </fieldset>
    </div>
  );
}

/** Image url + alt as a unit: both empty means "no image"; alt is required once there is a url. */
function ImagePair({ urlId, altId, url, alt, urlLabel, altLabel, urlError, altError, onChange }: {
  urlId: string; altId: string; url: string; alt: string; urlLabel: string; altLabel: string; urlError?: string; altError?: string;
  onChange(image: { url: string; alt: string } | undefined): void;
}) {
  // The upload resolves later: merge with the alt typed meanwhile, not the one captured at click time.
  const current = useRef({ url, alt });
  current.current = { url, alt };
  const emit = (next: { url: string; alt: string }) => onChange(next.url === '' && next.alt === '' ? undefined : next);
  return (
    <>
      <TextField id={urlId} label={urlLabel} max={L.urlMax} value={url} error={urlError} onChange={(v) => emit({ url: v, alt })} />
      <ImageUpload onUploaded={(uploaded) => emit({ url: uploaded, alt: current.current.alt })} />
      <TextField id={altId} label={altLabel} max={L.altMax} value={alt} error={altError} onChange={(v) => emit({ url, alt: v })} />
    </>
  );
}

type Counter = { value: string; label: string };

/** Two fixed slots kept locally, so an emptied first slot does not shift the second one while typing; only the saved props are compacted. */
function CounterPairs({ idFor, p, label, err, set }: {
  idFor(name: string): string; p: { counters: Counter[] };
  label(key: string, values?: Record<string, string | number>): string; err(...paths: string[]): string | undefined;
  set(props: Record<string, unknown>): void;
}) {
  const [slots, setSlots] = useState<Counter[]>(() => [0, 1].map((i) => p.counters[i] ?? { value: '', label: '' }));
  const update = (i: number, patch: Partial<Counter>) => {
    const next = slots.map((slot, n) => (n === i ? { ...slot, ...patch } : slot));
    setSlots(next);
    set({ counters: [...next.filter((c) => c.value !== '' || c.label !== ''), ...p.counters.slice(2)] });
  };
  return (
    <>
      {slots.map((slot, i) => (
        <div key={i} className={styles.pair}>
          <TextField id={idFor(`value-${i}`)} label={label('counterValue', { n: i + 1 })} max={L.statValueMax} value={slot.value}
            error={err(`counters.${i}.value`)} onChange={(value) => update(i, { value })} />
          <TextField id={idFor(`label-${i}`)} label={label('counterLabel', { n: i + 1 })} max={L.counterLabelMax} value={slot.label}
            error={err(`counters.${i}.label`)} onChange={(v) => update(i, { label: v })} />
        </div>
      ))}
    </>
  );
}
