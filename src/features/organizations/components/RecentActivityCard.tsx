'use client';

import styles from './RecentActivityCard.module.scss';

interface ActivityItem {
  id: string;
  description: string;
  timestamp: string;
}

interface Props {
  activities: ActivityItem[];
}

export function RecentActivityCard({ activities }: Props) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Atividade Recente</h3>

      {activities.length === 0 ? (
        <p className={styles.empty}>Nenhuma atividade recente.</p>
      ) : (
        <ul className={styles.list}>
          {activities.map((item) => (
            <li key={item.id} className={styles.item}>
              <span className={styles.dot} />
              <span className={styles.description}>{item.description}</span>
              <span className={styles.time}>
                {new Date(item.timestamp).toLocaleDateString('pt-BR')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
