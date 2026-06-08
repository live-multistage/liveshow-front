import { Globe, Camera, Zap } from 'lucide-react';
import styles from './FeaturesSection.module.scss';

const FEATURES = [
  {
    icon: <Globe size={20} />,
    title: 'Shows do Mundo Todo',
    desc: 'Rock, ópera, ballet, jazz e muito mais dos melhores palcos do planeta.',
  },
  {
    icon: <Camera size={20} />,
    title: 'Múltiplas Câmeras',
    desc: 'Grid configurável com até 4×4 câmeras simultâneas. Você escolhe o ângulo.',
  },
  {
    icon: <Zap size={20} />,
    title: 'Reprise & HD',
    desc: 'Perdeu um momento? Assista a reprise com qualidade Full HD a qualquer hora.',
  },
];

export function FeaturesSection() {
  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        {FEATURES.map((feat) => (
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
