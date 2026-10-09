'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2, X } from 'lucide-react';
import type { SeoRobotsRule } from '@live-show/api-contracts';
import { Button, Input } from '@live-show/design-system';
import { isValidRobotsPath, robotsRuleError } from '../utils/seo-robots';
import common from './SeoCommon.module.scss';
import styles from './RobotsRulesEditor.module.scss';

interface Props {
  n: number;
  rule: SeoRobotsRule;
  onChange: (rule: SeoRobotsRule) => void;
  onRemove: () => void;
}

type PathList = 'allow' | 'disallow';

export const USER_AGENT_SUGGESTIONS = ['*', 'GPTBot', 'CCBot', 'Google-Extended'];

export function RobotsRuleRow({ n, rule, onChange, onRemove }: Props) {
  const t = useTranslations('platformAdmin.seo.global.robots');
  const [drafts, setDrafts] = useState<Record<PathList, string>>({ allow: '', disallow: '' });
  const [pathError, setPathError] = useState(false);
  const agentInvalid = rule.userAgent !== '' && robotsRuleError({ ...rule, allow: [], disallow: [] }) === 'agent';

  const commit = (list: PathList) => {
    const value = drafts[list].trim();
    if (value === '') return;
    if (!isValidRobotsPath(value)) return setPathError(true);
    setPathError(false);
    setDrafts({ ...drafts, [list]: '' });
    if (!rule[list].includes(value)) onChange({ ...rule, [list]: [...rule[list], value] });
  };

  const paths = (list: PathList, label: string) => (
    <div className={styles.paths}>
      {rule[list].map((path) => (
        <span key={path} className={styles.pathChip}>
          {path}
          <button type="button" aria-label={t('removePath', { path })} onClick={() => onChange({ ...rule, [list]: rule[list].filter((p) => p !== path) })}>
            <X size={10} />
          </button>
        </span>
      ))}
      <Input
        className={common.mono}
        aria-label={label}
        placeholder={t('pathPlaceholder')}
        value={drafts[list]}
        onChange={(e) => setDrafts({ ...drafts, [list]: e.target.value })}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          commit(list);
        }}
      />
    </div>
  );

  return (
    <div className={styles.rule}>
      <div className={styles.ruleGrid}>
        <Input
          className={common.mono}
          list="seo-user-agents"
          aria-label={t('userAgent')}
          placeholder={t('userAgent')}
          aria-invalid={agentInvalid ? true : undefined}
          value={rule.userAgent}
          onChange={(e) => onChange({ ...rule, userAgent: e.target.value })}
        />
        {paths('allow', t('allow'))}
        {paths('disallow', t('disallow'))}
        <Button variant="outline" size="sm" aria-label={t('removeRule', { n })} onClick={onRemove}><Trash2 size={14} /></Button>
      </div>
      {agentInvalid && <p role="alert" className={common.error}>{t('errors.agent')}</p>}
      {pathError && <p role="alert" className={common.error}>{t('errors.path')}</p>}
    </div>
  );
}
