'use client';

import { useState } from 'react';
import { ChartCard } from './ChartCard';
import { Sparkline } from './Sparkline';
import type { SeriesColor } from './chart-series';

interface Props {
  title: string;
  data: number[];
  labels: string[];
  color: SeriesColor;
  formatValue?: (value: number) => string;
  height?: number;
}

// Card + chart together, since every panel wants the same pairing: the value
// in the header follows the hover, and falls back to the latest sample.
export function SparklineCard({ title, data, labels, color, formatValue, height }: Props) {
  const [active, setActive] = useState<{ index: number; value: number } | null>(null);
  const format = formatValue ?? ((value: number) => value.toLocaleString('pt-BR'));
  const shown = active?.value ?? data[data.length - 1];

  return (
    <ChartCard
      title={title}
      color={color}
      height={height}
      aside={shown == null ? undefined : format(shown)}
    >
      <Sparkline
        data={data}
        labels={labels}
        color={color}
        formatValue={format}
        onActiveChange={setActive}
      />
    </ChartCard>
  );
}
