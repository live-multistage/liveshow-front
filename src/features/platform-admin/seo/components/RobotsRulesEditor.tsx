'use client';

import { useTranslations } from 'next-intl';
import { Lock, Plus } from 'lucide-react';
import type { SeoRobotsRule } from '@live-show/api-contracts';
import { Button } from '@live-show/design-system';
import { FIXED_DISALLOW } from '@/features/seo/utils/build-robots';
import { MAX_ROBOTS_RULES, renderRobotsTxt } from '../utils/seo-robots';
import { RobotsRuleRow, USER_AGENT_SUGGESTIONS } from './RobotsRuleRow';
import common from './SeoCommon.module.scss';
import styles from './RobotsRulesEditor.module.scss';

interface Props {
  rules: SeoRobotsRule[];
  onChange: (rules: SeoRobotsRule[]) => void;
}

// Fixed rules come from code and are shown read-only; the admin can only append extra groups.
export function RobotsRulesEditor({ rules, onChange }: Props) {
  const t = useTranslations('platformAdmin.seo.global.robots');
  const setRule = (i: number, rule: SeoRobotsRule) => onChange(rules.map((r, j) => (j === i ? rule : r)));

  return (
    <section className={common.card}>
      <div>
        <div className={common.eyebrow}>{t('eyebrow')}</div>
        <div className={common.cardTitle}>{t('title')}</div>
      </div>
      <div className={styles.layout}>
        <div className={styles.main}>
          <div role="group" aria-label={t('fixedTitle')} className={styles.fixed}>
            <div className={styles.fixedHead}>
              <Lock size={13} aria-hidden /> {t('fixedTitle')} <span className={common.hint}>· {t('fixedCount', { n: FIXED_DISALLOW.length })}</span>
            </div>
            <div className={styles.fixedList}>
              {FIXED_DISALLOW.map((path) => <span key={path} className={styles.fixedPath}>{path}</span>)}
            </div>
          </div>

          <div className={common.field}>
            <div className={common.labelRow}>
              <span className={common.label}>{t('extraTitle')}</span>
              <span className={common.counter}>{rules.length}/{MAX_ROBOTS_RULES}</span>
            </div>
            <datalist id="seo-user-agents">
              {USER_AGENT_SUGGESTIONS.map((ua) => <option key={ua} value={ua} />)}
            </datalist>
            {rules.map((rule, i) => (
              <RobotsRuleRow key={i} n={i + 1} rule={rule} onChange={(r) => setRule(i, r)} onRemove={() => onChange(rules.filter((_, j) => j !== i))} />
            ))}
            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={rules.length >= MAX_ROBOTS_RULES}
                onClick={() => onChange([...rules, { userAgent: '', allow: [], disallow: [] }])}
              >
                <Plus size={13} /> {t('addRule')}
              </Button>
            </div>
          </div>
        </div>

        <div className={styles.preview}>
          <div className={common.eyebrow}>{t('preview')}</div>
          <pre className={styles.pre}>{renderRobotsTxt(rules.filter((r) => r.userAgent !== ''))}</pre>
        </div>
      </div>
    </section>
  );
}
