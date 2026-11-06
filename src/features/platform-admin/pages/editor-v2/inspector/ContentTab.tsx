'use client';

import { useTranslations } from 'next-intl';
import { ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Switch, Textarea } from '@live-show/design-system';
import {
  HEADING_TAGS, LIVE_NOW_LIMITS, MAILING_EVENT_CATEGORIES, PAGE_LIMITS, PAGE_RAIL_LIMITS, PAGE_RAIL_SOURCES, PAGE_V2_LIMITS as L,
  pageInlineVisibleLength, type ElementType, type PageRailSourceKind,
} from '@live-show/api-contracts';
import { CtaFields, Field, ImageUpload, Segment, TextField, issueFor } from '../../components/InspectorFields';
import { ArtistPicker } from '../../../mailing/components/ArtistPicker';
import { EventPicker } from '../../../mailing/components/EventPicker';
import { OrganizationPicker } from '../../../mailing/components/OrganizationPicker';
import type { ElementIssue } from './inspector-model';
import styles from './ElementInspector.module.scss';

type Props = Record<string, unknown>;

interface Tab {
  elementId: string;
  type: ElementType;
  props: Props;
  issues: ElementIssue[];
  /** Merges into the element's props; an `undefined` value removes the prop. */
  set(patch: Props): void;
}

const URL_MAX = 2048;
const optional = (value: string): string | undefined => (value === '' ? undefined : value);
const strings = (value: unknown): string[] => (Array.isArray(value) ? (value as string[]) : []);
type Qa = { question: string; answer: string };
const questions = (value: unknown): Qa[] => (Array.isArray(value) ? (value as Qa[]) : []);

export function ContentTab({ elementId, type, props, issues, set }: Tab) {
  const t = useTranslations('platformAdmin.pageEditorV2.inspector.content');
  const tCategory = useTranslations('platformAdmin.mailing.audience.eventCategory');
  const err = (...paths: string[]) => issueFor(issues, ...paths)?.message;
  const id = (name: string) => `${elementId}-${name}`;
  const text = (name: string) => (typeof props[name] === 'string' ? (props[name] as string) : '');

  switch (type) {
    case 'heading':
      return (
        <>
          <TextField id={id('text')} label={t('text')} max={L.headingMax} required multiline value={text('text')} error={err('text')} onChange={(v) => set({ text: v })} />
          <Segment label={t('level')} value={text('tag')} options={HEADING_TAGS.map((tag) => ({ value: tag, label: tag.toUpperCase() }))} onChange={(tag) => set({ tag })} />
          <p className={styles.hint}>{t('levelHint')}</p>
          {err('tag') && <p className={styles.error}>{err('tag')}</p>}
        </>
      );
    case 'text': {
      const value = text('text');
      return (
        <Field id={id('text')} label={t('text')} required counter={`${pageInlineVisibleLength(value)}/${L.textMax}`} hint={t('textHelp')} error={err('text')}>
          <Textarea id={id('text')} rows={6} value={value} onChange={(e) => set({ text: e.target.value })}
            aria-invalid={err('text') ? true : undefined} aria-describedby={err('text') ? `${id('text')}-error` : undefined} />
        </Field>
      );
    }
    case 'label':
      return <TextField id={id('text')} label={t('text')} max={L.labelMax} required value={text('text')} error={err('text')} onChange={(v) => set({ text: v })} />;
    case 'button':
      return (
        <>
          <TextField id={id('label')} label={t('buttonLabel')} max={L.buttonLabelMax} required value={text('label')} error={err('label')} onChange={(v) => set({ label: v })} />
          <TextField id={id('href')} label={t('href')} max={URL_MAX} required value={text('href')} error={err('href')} onChange={(v) => set({ href: v })} />
          <p className={styles.hint}>{t('hrefHint')}</p>
          <div className={styles.switchRow}>
            <span id={id('newTab')}>{t('newTab')}</span>
            <Switch aria-labelledby={id('newTab')} checked={props.newTab === true} onCheckedChange={(on) => set({ newTab: on ? true : undefined })} />
          </div>
        </>
      );
    case 'image':
      return (
        <>
          <TextField id={id('url')} label={t('imageUrl')} max={URL_MAX} required value={text('url')} error={err('url')} onChange={(v) => set({ url: v })} />
          <ImageUpload onUploaded={(url) => set({ url })} />
          <TextField id={id('alt')} label={t('alt')} max={L.altMax} required value={text('alt')} error={err('alt')} onChange={(v) => set({ alt: v })} />
        </>
      );
    case 'video':
      return (
        <>
          <TextField id={id('url')} label={t('videoUrl')} max={URL_MAX} required value={text('url')} error={err('url')} onChange={(v) => set({ url: v })} />
          <p className={styles.hint}>{t('videoHint')}</p>
        </>
      );
    case 'counter':
      return (
        <>
          <TextField id={id('value')} label={t('counterValue')} max={L.counterValueMax} required value={text('value')} error={err('value')} onChange={(v) => set({ value: v })} />
          <TextField id={id('label')} label={t('counterLabel')} max={L.counterLabelMax} required value={text('label')} error={err('label')} onChange={(v) => set({ label: v })} />
        </>
      );
    case 'iconList': {
      const items = strings(props.items);
      const update = (next: string[]) => set({ items: next });
      return (
        <>
          {items.map((item, i) => (
            <div key={i} className={styles.listItem}>
              <div className={styles.listHead}>
                <span>{t('item', { n: i + 1 })}</span>
                <Button type="button" variant="ghost" size="icon" aria-label={t('removeItem', { n: i + 1 })} onClick={() => update(items.filter((_, n) => n !== i))}><Trash2 aria-hidden="true" /></Button>
              </div>
              <Input aria-label={t('item', { n: i + 1 })} value={item} maxLength={L.iconListItemMax} onChange={(e) => update(items.map((v, n) => (n === i ? e.target.value : v)))} />
              {err(`items.${i}`) && <p className={styles.error}>{err(`items.${i}`)}</p>}
            </div>
          ))}
          {issues.find((i) => i.path === 'items') && <p className={styles.error}>{err('items')}</p>}
          <Button type="button" variant="outline" size="sm" disabled={items.length >= L.iconListMax} onClick={() => update([...items, ''])}><Plus aria-hidden="true" />{t('addItem')}</Button>
        </>
      );
    }
    case 'faq': {
      const items = questions(props.items);
      const update = (next: Qa[]) => set({ items: next });
      const patch = (i: number, part: Partial<Qa>) => update(items.map((q, n) => (n === i ? { ...q, ...part } : q)));
      return (
        <>
          {items.map((qa, i) => (
            <div key={i} className={styles.listItem}>
              <div className={styles.listHead}>
                <span>{t('question', { n: i + 1 })}</span>
                <span>
                  <Button type="button" variant="ghost" size="icon" aria-label={t('moveUp', { n: i + 1 })} disabled={i === 0}
                    onClick={() => update(items.map((_, n) => items[n === i ? i - 1 : n === i - 1 ? i : n]!))}><ArrowUp aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={t('removeItem', { n: i + 1 })} onClick={() => update(items.filter((_, n) => n !== i))}><Trash2 aria-hidden="true" /></Button>
                </span>
              </div>
              <TextField id={id(`q-${i}`)} label={t('questionText')} max={L.faqQuestionMax} required value={qa.question} error={err(`items.${i}.question`)} onChange={(v) => patch(i, { question: v })} />
              <TextField id={id(`a-${i}`)} label={t('answerText')} max={L.faqAnswerMax} required multiline value={qa.answer} error={err(`items.${i}.answer`)} onChange={(v) => patch(i, { answer: v })} />
            </div>
          ))}
          {issues.find((i) => i.path === 'items') && <p className={styles.error}>{err('items')}</p>}
          <Button type="button" variant="outline" size="sm" disabled={items.length >= L.faqMax} onClick={() => update([...items, { question: '', answer: '' }])}><Plus aria-hidden="true" />{t('addQuestion')}</Button>
        </>
      );
    }
    case 'plan': {
      const cta = props.cta as { label: string; href: string } | undefined;
      return (
        <>
          <TextField id={id('name')} label={t('planName')} max={L.planNameMax} required value={text('name')} error={err('name')} onChange={(v) => set({ name: v })} />
          <TextField id={id('price')} label={t('planPrice')} max={L.planPriceMax} required value={text('price')} error={err('price')} onChange={(v) => set({ price: v })} />
          <TextField id={id('description')} label={t('planDescription')} max={L.planDescriptionMax} multiline value={text('description')} error={err('description')}
            onChange={(v) => set({ description: optional(v) })} />
          <CtaFields id={id('cta')} labelText={t('planCtaLabel')} hrefText={t('planCtaHref')} value={cta} labelError={err('cta.label')} hrefError={err('cta.href')}
            onChange={(next) => set({ cta: next })} />
        </>
      );
    }
    case 'eventRail': {
      const source = (props.source as { kind: PageRailSourceKind; id?: string } | undefined) ?? { kind: 'live' };
      const setKind = (kind: PageRailSourceKind) => set({ source: kind === 'live' ? { kind } : { kind, id: kind === source.kind ? source.id : undefined } });
      const setSourceId = (value: string | undefined) => set({ source: { kind: source.kind, id: value } });
      return (
        <>
          <TextField id={id('title')} label={t('railTitle')} max={PAGE_LIMITS.railTitleMax} required value={text('title')} error={err('title')} onChange={(v) => set({ title: v })} />
          <Segment label={t('railSource')} value={source.kind} onChange={setKind}
            options={PAGE_RAIL_SOURCES.map((kind) => ({ value: kind, label: t(`source.${kind}`) }))} />
          {source.kind === 'category' && (
            <Field id={id('category')} label={t('source.category')} required error={err('source')}>
              <select id={id('category')} className={styles.select} value={source.id ?? ''} onChange={(e) => setSourceId(optional(e.target.value))}>
                <option value="" />
                {MAILING_EVENT_CATEGORIES.map((value) => <option key={value} value={value}>{tCategory(value)}</option>)}
              </select>
            </Field>
          )}
          {source.kind === 'organization' && <OrganizationPicker label={t('source.organization')} value={source.id} onChange={setSourceId} />}
          {source.kind === 'artist' && <ArtistPicker label={t('source.artist')} value={source.id} onChange={setSourceId} />}
          {(source.kind === 'organization' || source.kind === 'artist') && err('source') && <p className={styles.error}>{err('source')}</p>}
          <Segment label={t('limit')} value={String(props.limit ?? '')} onChange={(v) => set({ limit: Number(v) })}
            options={PAGE_RAIL_LIMITS.map((value) => ({ value: String(value), label: String(value) }))} />
          <p className={styles.hint}>{t('railHint')}</p>
        </>
      );
    }
    case 'featuredEvent': {
      const eventId = text('eventId');
      return (
        <>
          <EventPicker featurable value={eventId ? [eventId] : []} max={1} onChange={(ids) => set({ eventId: ids[0] ?? '' })} />
          {err('eventId') && <p className={styles.error}>{err('eventId')}</p>}
          <TextField id={id('cta')} label={t('featuredCta')} max={PAGE_LIMITS.ctaLabelMax} value={text('ctaLabel')} error={err('ctaLabel')} onChange={(v) => set({ ctaLabel: optional(v) })} />
        </>
      );
    }
    case 'liveNow':
      return (
        <>
          <Segment label={t('limit')} value={String(props.limit ?? '')} onChange={(v) => set({ limit: Number(v) })}
            options={LIVE_NOW_LIMITS.map((value) => ({ value: String(value), label: String(value) }))} />
          <TextField id={id('empty')} label={t('liveEmptyText')} max={L.emptyTextMax} required value={text('emptyText')} error={err('emptyText')} onChange={(v) => set({ emptyText: v })} />
        </>
      );
    default:
      return <p className={styles.hint}>{t(`none.${type}`)}</p>;
  }
}
