'use client';

import { useState } from 'react';
import { ChartCard } from './ChartCard';
import { LineChart } from './LineChart';
import type { SeriesColor } from './chart-series';

interface Props {
  title: string;
  data: number[];
  labels: string[];
  color: SeriesColor;
  formatValue?: (value: number) => string;
  height?: number;
}

// One series in a card. The value in the header follows the hover and falls
// back to the latest sample, so the chart itself needs no tooltip.
export function SparklineCard({ title, data, labels, color, formatValue, height }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const format = formatValue ?? ((value: number) => value.toLocaleString('pt-BR'));
  const shown = data[active ?? data.length - 1];

  return (
    <ChartCard
      title={title}
      color={color}
      height={height}
      aside={shown == null ? undefined : format(shown)}
    >
      <LineChart
        series={[{ label: title, data, color, fill: true }]}
        labels={labels}
        formatValue={format}
        onActiveChange={setActive}
        tooltip={false}
      />
    </ChartCard>
  );
}
