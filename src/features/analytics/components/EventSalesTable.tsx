'use client';

import { useGetEventSalesQuery } from '../hooks/use-event-sales';
import styles from './SalesDashboard.module.scss';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function EventSalesTable() {
  const { data, isLoading } = useGetEventSalesQuery();

  return (
    <div className={styles.tableCard}>
      <h3 className={styles.tableTitle}>Vendas por Evento</h3>

      {isLoading ? (
        <div className={styles.loadingWrap}>
          <span className={styles.spinner} />
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Evento</th>
                <th className={`${styles.th} ${styles.thRight}`}>Vendas</th>
                <th className={`${styles.th} ${styles.thRight}`}>Receita</th>
              </tr>
            </thead>
            <tbody>
              {data?.events.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.emptyCell}>
                    Nenhuma venda registrada ainda.
                  </td>
                </tr>
              )}
              {data?.events.map((row) => (
                <tr key={row.eventId} className={styles.tr}>
                  <td className={styles.td}>{row.eventTitle}</td>
                  <td className={`${styles.td} ${styles.tdRight}`}>{row.totalOrders}</td>
                  <td className={`${styles.td} ${styles.tdRight} ${styles.tdRevenue}`}>
                    {formatCurrency(row.totalRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
