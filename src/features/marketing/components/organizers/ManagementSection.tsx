import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import { FeatureRow } from '../shared/FeatureRow';
import { organizerIcon, type OrganizerIconKey } from '../../data/organizers-icons';
import styles from './ManagementSection.module.scss';

interface StatDef {
  key: string;
  value: string;
  color: 'primary' | 'price';
  delta: string;
}

const STATS: StatDef[] = [
  { key: 'sold', value: '1.284', color: 'primary', delta: 'sold' },
  { key: 'revenue', value: 'R$ 48.912', color: 'price', delta: 'revenue' },
  { key: 'avg', value: 'R$ 38,10', color: 'primary', delta: 'avg' },
  { key: 'watching', value: '2.031', color: 'primary', delta: 'watching' },
];

const CHART_BAR_COUNT = 20;

// ponytail: mirrors the design mock's chart bar-height formula 1:1.
function makeChartBars(): Array<{ h: number; pink: boolean }> {
  return Array.from({ length: CHART_BAR_COUNT }, (_, i) => {
    const h = 18 + (i / 19) ** 2.2 * 75 + Math.abs(Math.sin(i * 2.3)) * 12;
    return { h: Math.round(Math.min(100, h) * 1000) / 1000, pink: i >= 17 };
  });
}

const CAM_SHARE = [
  { pct: 54, color: '#ff2e9e' },
  { pct: 23, color: '#9810fa' },
  { pct: 14, color: 'rgba(255,255,255,.5)' },
  { pct: 9, color: 'rgba(255,255,255,.3)' },
];

const FEATURE_KEYS: Array<{ key: string; icon: OrganizerIconKey }> = [
  { key: 'sales', icon: 'chart' },
  { key: 'audience', icon: 'eye' },
  { key: 'reports', icon: 'file' },
  { key: 'ledger', icon: 'ledger' },
  { key: 'team', icon: 'users' },
  { key: 'ads', icon: 'ads' },
];

export function ManagementSection() {
  const t = useTranslations('organizersPage');
  const cams = t.raw('hero.mock.cams') as Array<{ name: string }>;
  const chartBars = makeChartBars();

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <SectionHeader label={t('management.label')} title={t('management.title')} />

        <Reveal as="div" variant="scale" delay={80} className={styles.panel}>
          <div className={styles.panelHead}>
            <div className={styles.panelHeadLeft}>
              {t('management.mock.sales')}
              <span className={styles.subtitle}>/ Final Estadual · Quadra Central</span>
            </div>
            <div className={styles.filters}>
              <span className={[styles.filterPill, styles.filterActive].join(' ')}>
                {t('management.mock.filters.today')}
              </span>
              <span className={styles.filterPill}>{t('management.mock.filters.week')}</span>
              <span className={styles.filterPill}>{t('management.mock.filters.event')}</span>
            </div>
          </div>

          <div className={styles.statsGrid}>
            {STATS.map((stat) => (
              <div key={stat.key} className={styles.statCell}>
                <div className={styles.statLabel}>{t(`management.mock.stats.${stat.key}`)}</div>
                <div className={[styles.statValue, stat.color === 'price' ? styles.statPrice : ''].join(' ').trim()}>
                  {stat.value}
                </div>
                <div className={styles.statDelta}>
                  {stat.key === 'sold' && `+126 ${t('management.mock.deltas.sold')}`}
                  {stat.key === 'revenue' && `+R$ 3.760 ${t('management.mock.deltas.revenue')}`}
                  {stat.key === 'avg' && `+2,4% ${t('management.mock.deltas.avg')}`}
                  {stat.key === 'watching' && `${t('management.mock.deltas.watching')} 2.310`}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.bottomGrid}>
            <div className={styles.chartCol}>
              <div className={styles.colLabel}>{t('management.mock.salesPerHour')}</div>
              <div className={styles.chart}>
                {chartBars.map((bar, i) => (
                  <span
                    key={i}
                    className={bar.pink ? styles.barPink : styles.bar}
                    style={{ height: `${bar.h}%` }}
                  />
                ))}
              </div>
              <div className={styles.axis}>
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>20:00</span>
                <span>{t('management.mock.now')}</span>
              </div>
            </div>
            <div className={styles.audienceCol}>
              <div className={styles.colLabel}>{t('management.mock.audiencePerCam')}</div>
              <div className={styles.audienceRows}>
                {cams.map((cam, i) => (
                  <div key={cam.name}>
                    <div className={styles.audienceRowHead}>
                      <span>{cam.name}</span>
                      <span className={styles.audiencePct}>{CAM_SHARE[i].pct}%</span>
                    </div>
                    <div className={styles.audienceTrack}>
                      <div
                        className={styles.audienceFill}
                        style={{ width: `${CAM_SHARE[i].pct}%`, background: CAM_SHARE[i].color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className={styles.features}>
          {FEATURE_KEYS.map((f, i) => (
            <FeatureRow
              key={f.key}
              icon={organizerIcon(f.icon)}
              title={t(`management.features.${f.key}.title`)}
              text={t(`management.features.${f.key}.text`)}
              tone="violet"
              delay={(i % 2) * 90}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
