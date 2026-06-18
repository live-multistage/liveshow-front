import { useTranslations } from 'next-intl';
import { Globe, Camera, Zap } from 'lucide-react';
import styles from './FeaturesSection.module.scss';

export function FeaturesSection() {
  const t = useTranslations('home.features');

  const features = [
    { icon: <Globe size={20} />, title: t('worldShows'), desc: t('worldShowsDesc') },
    { icon: <Camera size={20} />, title: t('multiCamera'), desc: t('multiCameraDesc') },
    { icon: <Zap size={20} />, title: t('replayHd'), desc: t('replayHdDesc') },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        {features.map((feat) => (
          <div key={feat.title} className={styles.item}>
            <div className={styles.icon}>{feat.icon}</div>
            <h3 className={styles.itemTitle}>{feat.title}</h3>
            <p className={styles.itemDesc}>{feat.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
