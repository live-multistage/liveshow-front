'use client';

import { useState } from 'react';
import { SalesDashboard } from '@/features/analytics/components/SalesDashboard';
import { useGetMySalesQuery } from '@/features/analytics/hooks/use-my-sales';
import type { SalesGranularity } from '@/features/analytics/types/sales.types';
import styles from '../layout.module.scss';

export default function DashboardSalesPage() {
  const [granularity, setGranularity] = useState<SalesGranularity>('month');
  const { data, isLoading } = useGetMySalesQuery(granularity);

  return (
    <>
      <h1 className={styles.pageTitle}>Vendas</h1>
      <SalesDashboard
        data={data}
        isLoading={isLoading}
        granularity={granularity}
        onGranularityChange={setGranularity}
      />
    </>
  );
}
