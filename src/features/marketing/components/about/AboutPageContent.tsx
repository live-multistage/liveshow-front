import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import { organizerIcon, type OrganizerIconKey } from '../../data/organizers-icons';
import { HeroPlayerMock } from '../organizers/HeroPlayerMock';
import { LatencyPanel } from '../mocks/LatencyPanel';
import { ReplayMock } from '../mocks/ReplayMock';
import { TicketPairMock } from '../mocks/TicketPairMock';
import { ProofSection } from './ProofSection';
import ctaStyles from '../shared/OrganizerCtaLink.module.scss';
import styles from './AboutPageContent.module.scss';

const CONTACT_EMAIL = 'privacidade@showon.io';

const AUDIENCE_ICONS: Record<string, OrganizerIconKey> = {
  shows: 'music',
  sports: 'trophy',
  talks: 'mic',
  worship: 'church',
  theater: 'drama',
  classes: 'book',
};

const AUDIENCE_KEYS = Object.keys(AUDIENCE_ICONS);

interface DiffBlockProps {
  label: string;
  title: string;
  text: string;
  viewerLabel: string;
  organizerLabel: string;
  viewer: string;
  organizer: string;
  visual: ReactNode;
  visualFirst?: boolean;
  withTopBorder?: boolean;
}

function DiffBlock({
  label,
  title,
  text,
  viewerLabel,
  organizerLabel,
  viewer,
  organizer,
  visual,
  visualFirst = false,
  withTopBorder = false,
}: DiffBlockProps) {
  const rootCls = [styles.diff, withTopBorder ? styles.diffBorder : ''].join(' ').trim();
  const visualCls = [styles.diffVisual, visualFirst ? styles.diffVisualFirst : ''].join(' ').trim();

  return (
    <div className={rootCls}>
      <Reveal as="div" className={styles.diffText}>
        <div className={styles.diffLabel}>{label}</div>
        <h3 className={styles.diffTitle}>{title}</h3>
        <p className={styles.diffP}>{text}</p>
        <div className={styles.diffRow}>
          <span>{viewerLabel}</span>
          <span>{viewer}</span>
        </div>
        <div className={styles.diffRow}>
          <span>{organizerLabel}</span>
          <span>{organizer}</span>
        </div>
      </Reveal>
      <Reveal as="div" variant="scale" delay={120} className={visualCls}>
        {visual}
      </Reveal>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/require-await -- kept async so `<ProofSection />`
// (an async server component) composes cleanly and callers can `await AboutPageContent()` in tests.
export async function AboutPageContent() {
  // Async server component: hooks are off-limits, so translations come from
  // the server API (which also carries `.raw`).
  const [t, tOrganizers] = await Promise.all([getTranslations('aboutPage'), getTranslations('organizersPage')]);

  const manifesto = t.raw('hero.manifesto') as string[];
  const steps = t.raw('how.steps') as Array<{ title: string; text: string }>;
  const signals = (tOrganizers.raw('transmission.signals') as Array<{ name: string }>).slice(0, 2);

  const viewerLabel = t('diff.viewerLabel');
  const organizerLabel = t('diff.organizerLabel');

  return (
    <main className={styles.page}>
      {/* S1 — Manifesto */}
      <section className={styles.hero}>
        <div className={styles.glowTop} aria-hidden="true" />
        <div className={styles.blob} aria-hidden="true" />
        <div className={styles.container}>
          <Reveal as="div" className={styles.label}>
            {t('hero.label')}
          </Reveal>
          <Reveal as="h1" delay={100} className={styles.title}>
            {t('hero.title')} <span className={styles.accent}>{t('hero.titleAccent')}</span>
          </Reveal>
          <div className={styles.manifesto}>
            <Reveal as="p" delay={160} className={styles.manifestoP}>
              {manifesto[0]}
            </Reveal>
            <Reveal as="p" delay={220} className={styles.manifestoPEmphasis}>
              {manifesto[1]}
            </Reveal>
            <Reveal as="p" delay={280} className={styles.manifestoP}>
              {manifesto[2]}
            </Reveal>
          </div>
        </div>
      </section>

      {/* S2 — Diferenciais */}
      <section className={styles.diffSection}>
        <div className={styles.container}>
          <SectionHeader label={t('diff.label')} title={t('diff.title')} maxTitleCh={30} />

          <DiffBlock
            label={t('diff.items.multicam.label')}
            title={t('diff.items.multicam.title')}
            text={t('diff.items.multicam.text')}
            viewerLabel={viewerLabel}
            organizerLabel={organizerLabel}
            viewer={t('diff.items.multicam.viewer')}
            organizer={t('diff.items.multicam.organizer')}
            visual={<HeroPlayerMock compact />}
          />

          <DiffBlock
            label={t('diff.items.latency.label')}
            title={t('diff.items.latency.title')}
            text={t('diff.items.latency.text')}
            viewerLabel={viewerLabel}
            organizerLabel={organizerLabel}
            viewer={t('diff.items.latency.viewer')}
            organizer={t('diff.items.latency.organizer')}
            visual={<LatencyPanel label={t('mocks.latencyLabel')} pill={t('mocks.lowLatency')} signals={signals} />}
            visualFirst
            withTopBorder
          />

          <DiffBlock
            label={t('diff.items.replay.label')}
            title={t('diff.items.replay.title')}
            text={t('diff.items.replay.text')}
            viewerLabel={viewerLabel}
            organizerLabel={organizerLabel}
            viewer={t('diff.items.replay.viewer')}
            organizer={t('diff.items.replay.organizer')}
            visual={<ReplayMock />}
            withTopBorder
          />

          <DiffBlock
            label={t('diff.items.tickets.label')}
            title={t('diff.items.tickets.title')}
            text={t('diff.items.tickets.text')}
            viewerLabel={viewerLabel}
            organizerLabel={organizerLabel}
            viewer={t('diff.items.tickets.viewer')}
            organizer={t('diff.items.tickets.organizer')}
            visual={
              <TicketPairMock
                live={t('mocks.live')}
                event={t('mocks.event')}
                date={t('mocks.ticketDate')}
                digitalLabel={t('mocks.digital')}
                physicalLabel={t('mocks.physical')}
                gate={t('mocks.gate')}
                access={t('mocks.access')}
                watch={t('mocks.watch')}
              />
            }
            visualFirst
            withTopBorder
          />
        </div>
      </section>

      {/* S3 — Para quem */}
      <section className={styles.audiencesSection}>
        <div className={styles.container}>
          <SectionHeader label={t('audiences.label')} title={t('audiences.title')} align="center" maxTitleCh={16} />
          <div className={styles.audiencesGrid}>
            {AUDIENCE_KEYS.map((key, i) => (
              <Reveal as="div" key={key} delay={(i % 3) * 90} className={styles.audienceCard}>
                <span className={styles.audienceChip}>{organizerIcon(AUDIENCE_ICONS[key] as OrganizerIconKey, 18)}</span>
                <div className={styles.audienceTitle}>{t(`audiences.items.${key}.title`)}</div>
                <div className={styles.audienceText}>{t(`audiences.items.${key}.text`)}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* S4 — Como funciona */}
      <section className={styles.howSection}>
        <div className={styles.container}>
          <SectionHeader label={t('how.label')} title={t('how.title')} maxTitleCh={30} />
          <div className={styles.howGrid}>
            {steps.map((step, i) => (
              <Reveal as="div" key={step.title} delay={i * 90} className={styles.howCard}>
                <span className={styles.howNum}>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div className={styles.howCardTitle}>{step.title}</div>
                  <div className={styles.howCardText}>{step.text}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal as="div" delay={200}>
            <Link href="/events" className={styles.howLink}>
              {t('how.link')} <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* S5 — Prova social (opcional) */}
      <ProofSection />

      {/* S6 — Quem faz */}
      <section className={styles.teamSection}>
        <div className={styles.container}>
          <div className={styles.teamGrid}>
            <Reveal as="div">
              <div className={styles.label}>{t('team.label')}</div>
              <h2 className={styles.teamTitle}>{t('team.title')}</h2>
            </Reveal>
            <Reveal as="div">
              <p className={styles.teamText}>{t('team.text')}</p>
              <div className={styles.teamLinks}>
                <Link href="/help" className={styles.teamLink}>
                  {t('team.links.help')}
                </Link>
                <span className={styles.teamLinkSep} aria-hidden="true">
                  ·
                </span>
                <a href={`mailto:${CONTACT_EMAIL}`} className={styles.teamLink}>
                  {t('team.links.contact')}
                </a>
                <span className={styles.teamLinkSep} aria-hidden="true">
                  ·
                </span>
                <Link href="/privacidade" className={styles.teamLink}>
                  {t('team.links.privacy')}
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* S7 — CTA duplo */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaGlow} aria-hidden="true" />
        <div className={styles.container}>
          <Reveal as="h2" className={styles.ctaTitle}>
            {t('cta.title')}
          </Reveal>
          <div className={styles.ctaGrid}>
            <Reveal as="div" delay={80} className={styles.ctaCard}>
              <div>
                <div className={styles.ctaCardTitle}>{t('cta.viewer.title')}</div>
                <div className={styles.ctaCardText}>{t('cta.viewer.text')}</div>
              </div>
              <Link href="/events" className={styles.ctaViewerButton}>
                {t('cta.viewer.button')} <ArrowRight size={17} strokeWidth={2.4} />
              </Link>
            </Reveal>
            <Reveal as="div" delay={160} className={`${styles.ctaCard} ${styles.ctaCardOrganizer}`}>
              <div className={styles.ctaGlowInner} aria-hidden="true" />
              <div>
                <div className={styles.ctaCardTitle}>{t('cta.organizer.title')}</div>
                <div className={styles.ctaCardText}>{t('cta.organizer.text')}</div>
              </div>
              <Link href="/be-partner" className={`${ctaStyles.cta} ${ctaStyles.lg} ${styles.ctaOrganizerButton}`}>
                {t('cta.organizer.button')} <ArrowRight size={17} strokeWidth={2.4} />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
