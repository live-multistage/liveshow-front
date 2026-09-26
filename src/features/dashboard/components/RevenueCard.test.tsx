import { describe, it, expect, vi } from 'vitest';
vi.mock('@/features/platform-admin/queries/get-finance', () => ({ usePlatformRevenueQuery: vi.fn() }));
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevenueCard } from './RevenueCard';
import { usePlatformRevenueQuery } from '@/features/platform-admin/queries/get-finance';

const mockedQuery = vi.mocked(usePlatformRevenueQuery);

function series(days: number) {
  // 2026-09-01 .. — calendar days, exactly the shape the API returns.
  return Array.from({ length: days }, (_, i) => ({
    date: `2026-09-${String(i + 1).padStart(2, '0')}`,
    revenue: i === days - 1 ? 1000 : 0,
  }));
}

function mockRevenue(days: number) {
  mockedQuery.mockReturnValue({
    data: {
      rangeDays: days,
      byCurrency: [{
        currency: 'BRL',
        revenue: 1000,
        revenueDeltaPct: 12,
        gmv: 10000,
        avgRate: 0.1,
        avgTicket: 98,
        series: series(days),
      }],
    },
    isLoading: false,
  } as ReturnType<typeof usePlatformRevenueQuery>);
}

describe('RevenueCard — bar tooltip', () => {
  it('shows what the bar is and its exact value on hover', async () => {
    mockRevenue(30);
    const { container } = render(<RevenueCard range="30d" />);

    const bars = container.querySelectorAll('[class*="barCol"]');
    await userEvent.hover(bars[bars.length - 1]);

    // Exact, not the compact "R$ 1,0k" the bar already conveys. Radix renders
    // the content twice — the visible tip plus a hidden copy it points
    // aria-describedby at — so match all of them.
    expect((await screen.findAllByText('Comissão R$ 1.000,00')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('30/09').length).toBeGreaterThan(0);
  });

  // Two tooltips for one bar is worse than none.
  it('drops the native title so the browser tooltip cannot double up', () => {
    mockRevenue(30);
    const { container } = render(<RevenueCard range="30d" />);

    expect(container.querySelector('[class*="barCol"][title]')).toBeNull();
  });
});

describe('RevenueCard — KPI strip', () => {
  // The three KPIs used to be a footer block under the chart; inline they keep
  // the card the height of its row neighbour.
  it('shows GMV, rate and ticket beside the chart legend, not in a footer', () => {
    mockRevenue(30);
    const { container } = render(<RevenueCard range="30d" />);

    const strip = container.querySelector('[class*="finStatStrip"]');
    expect(strip).toBeTruthy();
    expect(strip?.textContent).toContain('GMV');
    expect(strip?.textContent).toContain('TAXA');
    expect(strip?.textContent).toContain('TICKET');
    expect(container.querySelector('[class*="finFooter"]')).toBeNull();
  });

  it('keeps every figure it used to show', () => {
    mockRevenue(30);
    render(<RevenueCard range="30d" />);

    expect(screen.getByText('10%')).toBeInTheDocument();      // avgRate 0.1
    expect(screen.getAllByText(/R\$/).length).toBeGreaterThan(2); // gmv + ticket + headline
  });
});

describe('RevenueCard — headline placement', () => {
  it('puts the single-currency headline on the card title line, out of the chart', () => {
    mockRevenue(30);
    const { container } = render(<RevenueCard range="30d" />);

    const header = container.querySelector('[class*="finHeader"]');
    expect(header?.textContent).toContain('R$');
    expect(header?.textContent).toContain('+12%');
  });

  // Several currencies are never summed, so one number beside a title that
  // covers them all would read as a total it is not.
  it('keeps the headline inside each block when there is more than one currency', () => {
    mockedQuery.mockReturnValue({
      data: {
        rangeDays: 30,
        byCurrency: ['BRL', 'USD'].map((currency) => ({
          currency, revenue: 1000, revenueDeltaPct: 12, gmv: 10000,
          avgRate: 0.1, avgTicket: 98, series: series(30),
        })),
      },
      isLoading: false,
    } as ReturnType<typeof usePlatformRevenueQuery>);

    const { container } = render(<RevenueCard range="30d" />);

    const header = container.querySelector('[class*="finHeader"]');
    expect(header?.textContent).not.toContain('R$');
    expect(container.querySelectorAll('[class*="finBig"]')).toHaveLength(2);
  });
});

describe('RevenueCard — chart axes', () => {
  it('labels what the bars measure', () => {
    mockRevenue(30);
    render(<RevenueCard range="30d" />);

    expect(screen.getByText('Comissão por dia (BRL)')).toBeInTheDocument();
  });

  it('labels the last day of the series, so the end is never ambiguous', () => {
    mockRevenue(30);
    render(<RevenueCard range="30d" />);

    expect(screen.getByText('30/09')).toBeInTheDocument();
  });

  // Bars stay readable by scrolling, so every column can carry its own date.
  it('labels every bar and keeps one tick per column', () => {
    mockRevenue(30);
    const { container } = render(<RevenueCard range="30d" />);

    const ticks = Array.from(container.querySelectorAll('[class*="xTick"]'));
    expect(ticks).toHaveLength(30);
    expect(ticks.every((t) => t.textContent !== '')).toBe(true);
    expect(ticks[0].textContent).toBe('01/09');
    expect(ticks[29].textContent).toBe('30/09');
  });

  // 90 hairlines is a shape, not a chart: at most 7 bars share the visible
  // width and the rest scroll.
  it('caps the visible bars at 7 and scrolls the rest', () => {
    mockRevenue(90);
    const { container } = render(<RevenueCard range="90d" />);

    const scroller = container.querySelector('[class*="chartScroll"]') as HTMLElement;
    expect(scroller).toBeTruthy();
    expect(scroller.style.getPropertyValue('--bar-cols')).toBe('7');
    expect(container.querySelectorAll('[class*="barCol"]')).toHaveLength(90);
  });

  it('does not stretch to 7 columns when the series is shorter', () => {
    mockRevenue(3);
    const { container } = render(<RevenueCard range="30d" />);

    const scroller = container.querySelector('[class*="chartScroll"]') as HTMLElement;
    expect(scroller.style.getPropertyValue('--bar-cols')).toBe('3');
  });

  // Keyboard users need to reach a scrollable region.
  it('exposes the scroller as a focusable labelled group', () => {
    mockRevenue(90);
    const { container } = render(<RevenueCard range="90d" />);

    const scroller = container.querySelector('[class*="chartScroll"]') as HTMLElement;
    expect(scroller.getAttribute('tabindex')).toBe('0');
    expect(scroller.getAttribute('aria-label')).toContain('90 dias');
  });

  it('shows the y scale so a bar height has a value', () => {
    mockRevenue(30);
    render(<RevenueCard range="30d" />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getAllByText(/R\$/).length).toBeGreaterThan(0);
  });

  // A date is a calendar day: parsing it as a Date shifts it a day in UTC-3.
  it('reads the day straight off the string', () => {
    mockedQuery.mockReturnValue({
      data: {
        rangeDays: 1,
        byCurrency: [{
          currency: 'BRL', revenue: 1, revenueDeltaPct: 0, gmv: 1, avgRate: 0.1, avgTicket: 1,
          series: [{ date: '2026-09-01', revenue: 1 }],
        }],
      },
      isLoading: false,
    } as ReturnType<typeof usePlatformRevenueQuery>);

    render(<RevenueCard range="30d" />);

    expect(screen.getByText('01/09')).toBeInTheDocument();
  });
});
