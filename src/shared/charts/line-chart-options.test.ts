import { describe, it, expect } from 'vitest';
import type { TooltipItem } from 'chart.js';
import { lineChartOptions } from './line-chart-options';

function tooltipLabel(options: ReturnType<typeof lineChartOptions>, ctx: unknown): string {
  const callback = options.plugins?.tooltip?.callbacks?.label;
  if (typeof callback !== 'function') throw new Error('no label callback');
  return callback.call({} as never, ctx as TooltipItem<'line'>) as string;
}

const ctx = (label: string, y: number) => ({ dataset: { label }, parsed: { y } });

describe('lineChartOptions', () => {
  // The default (intersect: true) only fires on the 3.4px point itself, which
  // is why hovering most of the chart used to do nothing.
  it('shows the tooltip from anywhere in the column, not only on the point', () => {
    const options = lineChartOptions();

    expect(options.interaction?.intersect).toBe(false);
    expect(options.interaction?.mode).toBe('index');
  });

  it('names the series and formats counts by default', () => {
    expect(tooltipLabel(lineChartOptions(), ctx('Vendas', 1234))).toBe('Vendas: 1.234');
  });

  it('formats money through the caller, so a revenue series is not a raw float', () => {
    const options = lineChartOptions({
      formatValue: (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    });

    expect(tooltipLabel(options, ctx('Receita (BRL)', 1234.5))).toContain('R$');
    expect(tooltipLabel(options, ctx('Receita (BRL)', 1234.5))).toContain('1.234,50');
  });

  it('shows the value alone when a dataset has no label', () => {
    expect(tooltipLabel(lineChartOptions(), ctx('', 7))).toBe('7');
  });
});
