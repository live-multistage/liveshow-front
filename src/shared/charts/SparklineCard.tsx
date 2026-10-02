'use client';

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

// One series in a card. The header shows the latest sample; the hover tooltip
// gives the value of any other month.
export function SparklineCard({ title, data, labels, color, formatValue, height }: Props) {
  const format = formatValue ?? ((value: number) => value.toLocaleString('pt-BR'));
  const latest = data[data.length - 1];

  return (
    <ChartCard
      title={title}
      color={color}
      height={height}
      aside={latest == null ? undefined : format(latest)}
    >
      <LineChart
        series={[{ label: title, data, color, fill: true }]}
        labels={labels}
        formatValue={format}
        tooltip
      />
    </ChartCard>
  );
}
