import type { ChartOptions } from 'chart.js';

// One options object for every Chart.js line in the app. It used to be four
// near-identical copies (organizer dashboard, sales, analytics, org analytics),
// which is why the tooltip behaved differently depending on which panel you
// were looking at.
const MONO = "'Space Mono', monospace";

export interface LineChartOptionsInput {
  /** Tooltip value formatter. Default: a plain pt-BR number (counts). */
  formatValue?: (value: number) => string;
}

export function lineChartOptions({ formatValue }: LineChartOptionsInput = {}): ChartOptions<'line'> {
  const format = formatValue ?? ((value: number) => value.toLocaleString('pt-BR'));

  return {
    responsive: true,
    maintainAspectRatio: false,
    // The point that matters: Chart.js defaults to intersect:true, so a tooltip
    // only appears when the cursor lands on the 3.4px point itself. Anywhere
    // else on the chart — which is most of it — hovering did nothing. `index`
    // picks the nearest column instead.
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#101013',
        borderColor: 'rgba(255,255,255,.08)',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#9a9aa2',
        titleFont: { family: MONO, size: 11 },
        bodyFont: { family: MONO, size: 12 },
        padding: 10,
        callbacks: {
          // "Receita (BRL): R$ 1.234,00" — the dataset label says what the
          // number is, the formatter makes it readable. Without this a money
          // series renders as a raw float. An unlabelled dataset shows the
          // value alone rather than a dangling colon.
          label: (ctx) => {
            const value = format(ctx.parsed.y);
            return ctx.dataset.label ? `${ctx.dataset.label}: ${value}` : value;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: { color: '#6f6f77', font: { family: MONO, size: 10 } },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(255,255,255,.04)' },
        ticks: { color: '#6f6f77', font: { family: MONO, size: 10 }, precision: 0 },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };
}
