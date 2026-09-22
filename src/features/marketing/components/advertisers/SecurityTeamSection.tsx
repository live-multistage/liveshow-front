import { useTranslations } from 'next-intl';
import { Users2 } from 'lucide-react';
import { Reveal } from '../shared/Reveal';
import styles from './SecurityTeamSection.module.scss';

// Illustrative team members for the mock panel — same precedent as the
// "RockFest Produções" account name used in HowItWorks' mock screens.
const TEAM_MOCK = [
  { initials: 'BR', name: 'Bruno Rockfest', email: 'organizer@rockfest.com', role: 'owner' as const },
  { initials: 'MC', name: 'Marina Costa', email: 'marina@rockfest.com', role: 'manager' as const },
];

export function SecurityTeamSection() {
  const t = useTranslations('advertisersPage.security');
  const tags = t.raw('tags') as string[];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <Reveal as="div" className={styles.copyCol}>
          <div className={styles.label}>{t('label')}</div>
          <h2 className={styles.title}>{t('title')}</h2>
          <p className={styles.text}>{t('text')}</p>
          <div className={styles.tags}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal as="div" delay={120} variant="scale" className={styles.teamCard} ariaHidden>
          <div className={styles.teamHead}>
            <span className={styles.teamIcon}>
              <Users2 size={19} strokeWidth={2} />
            </span>
            <div>
              <h3 className={styles.teamTitle}>{t('teamTitle')}</h3>
              <div className={styles.teamText}>{t('teamText')}</div>
            </div>
          </div>
          {TEAM_MOCK.map((member) => (
            <div key={member.email} className={styles.memberRow}>
              <div className={styles.memberInfo}>
                <div className={[styles.avatar, styles[`avatar_${member.role}`]].join(' ')}>{member.initials}</div>
                <div className={styles.memberText}>
                  <div className={styles.memberName}>{member.name}</div>
                  <div className={styles.memberEmail}>{member.email}</div>
                </div>
              </div>
              <span className={[styles.rolePill, styles[`role_${member.role}`]].join(' ')}>
                {t(`roles.${member.role}`)}
              </span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
