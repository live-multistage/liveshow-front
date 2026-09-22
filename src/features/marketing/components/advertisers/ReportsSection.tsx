import { useTranslations } from 'next-intl';
import { Reveal } from '../shared/Reveal';
import { SectionHeader } from '../shared/SectionHeader';
import styles from './ReportsSection.module.scss';

const KPI_KEYS = ['impressions', 'clicks', 'ctr', 'spend'] as const;
const KPI_VALUES: Record<(typeof KPI_KEYS)[number], { value: string; price?: boolean }> = {
  impressions: { value: '184k' },
  clicks: { value: '8.420' },
  ctr: { value: '4,6%' },
  spend: { value: 'R$ 2.140', price: true },
};

// Bar heights mirror the design mock's formula 1:1 — illustrative, not real data.
const CHART_BARS = Array.from({ length: 30 }, (_, i) => {
  const h = 20 + Math.abs(Math.sin(i * 0.9)) * 40 + (i / 29) * 40;
  return { h: Math.round(Math.min(100, h) * 1000) / 1000, pink: i >= 26 };
});

interface ByPositionRow {
  positionKey: 'feed' | 'pause' | 'event' | 'preroll' | 'checkout';
  impr: string;
  clk: string;
  ctr: string;
  ctrGood: boolean;
  spent: string;
}

const BY_POSITION: ByPositionRow[] = [
  { positionKey: 'feed', impr: '82.400', clk: '4.120', ctr: '5,0%', ctrGood: true, spent: 'R$ 980' },
  { positionKey: 'pause', impr: '41.200', clk: '2.310', ctr: '5,6%', ctrGood: true, spent: 'R$ 620' },
  { positionKey: 'event', impr: '34.600', clk: '1.180', ctr: '3,4%', ctrGood: false, spent: 'R$ 330' },
  { positionKey: 'preroll', impr: '18.900', clk: '640', ctr: '3,4%', ctrGood: false, spent: 'R$ 150' },
  { positionKey: 'checkout', impr: '6.900', clk: '170', ctr: '2,5%', ctrGood: false, spent: 'R$ 60' },
];

export function ReportsSection() {
  const t = useTranslations('advertisersPage.reports');

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <SectionHeader label={t('label')} title={t('title')} text={t('subtitle')} />

        <Reveal as="div" delay={80} variant="scale" className={styles.panel}>
          <div className={styles.panelHead}>
            <div className={styles.panelHeadLeft}>
              {t('panelTitle')}
              <span className={styles.subtitle}>/ {t('panelSubtitle')}</span>
            </div>
          </div>

          <div className={styles.kpiGrid}>
            {KPI_KEYS.map((key) => (
              <div key={key} className={styles.kpiCell}>
                <div className={styles.kpiLabel}>{t(`kpis.${key}`)}</div>
                <div className={[styles.kpiValue, KPI_VALUES[key].price ? styles.kpiPrice : ''].join(' ').trim()}>
                  {KPI_VALUES[key].value}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.chartSection}>
            <div className={styles.colLabel}>{t('dailyLabel')}</div>
            <div className={styles.chart}>
              {CHART_BARS.map((bar, i) => (
                <span key={i} className={bar.pink ? styles.barPink : styles.bar} style={{ height: `${bar.h}%` }} />
              ))}
            </div>
          </div>

          <div className={styles.tableSection}>
            <div className={styles.colLabel}>{t('byPositionTitle')}</div>
            <div className={styles.tableHead}>
              <span>{t('columns.position')}</span>
              <span className={styles.right}>{t('columns.impressions')}</span>
              <span className={styles.right}>{t('columns.clicks')}</span>
              <span className={styles.right}>{t('columns.ctr')}</span>
              <span className={styles.right}>{t('columns.spend')}</span>
            </div>
            {BY_POSITION.map((row) => (
              <div key={row.positionKey} className={styles.tableRow}>
                <span className={styles.posName}>{t(`positions.${row.positionKey}`)}</span>
                <span className={`${styles.right} ${styles.mono}`}>{row.impr}</span>
                <span className={`${styles.right} ${styles.monoDim}`}>{row.clk}</span>
                <span className={[styles.right, styles.mono, row.ctrGood ? styles.ctrGood : styles.ctrWarn].join(' ')}>
                  {row.ctr}
                </span>
                <span className={`${styles.right} ${styles.monoPrice}`}>{row.spent}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
