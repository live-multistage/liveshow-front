import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination, paginationWindow } from './pagination';

const labels = {
  prev: 'ANTERIOR',
  next: 'PRÓXIMA',
  nav: 'Paginação',
  prevAria: 'Página anterior',
  nextAria: 'Próxima página',
};

describe('paginationWindow', () => {
  it('returns just page 1 when there is a single page', () => {
    expect(paginationWindow(1, 1)).toEqual([1]);
  });

  it('returns every page when there are few of them', () => {
    expect(paginationWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('windows around the current page with gaps on both sides', () => {
    expect(paginationWindow(5, 113)).toEqual([1, 'gap', 4, 5, 6, 'gap', 113]);
  });

  it('has no leading gap when the window starts at page 1', () => {
    expect(paginationWindow(1, 10)).toEqual([1, 2, 'gap', 10]);
  });

  it('has no trailing gap when the window ends at the last page', () => {
    expect(paginationWindow(10, 10)).toEqual([1, 'gap', 9, 10]);
  });
});

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} onPageChange={vi.fn()} labels={labels} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('disables prev on the first page and next on the last page', () => {
    render(<Pagination page={1} pageCount={5} onPageChange={vi.fn()} labels={labels} />);
    expect(screen.getByLabelText('Página anterior')).toBeDisabled();
    expect(screen.getByLabelText('Próxima página')).not.toBeDisabled();
  });

  it('marks the current page with aria-current', () => {
    render(<Pagination page={3} pageCount={5} onPageChange={vi.fn()} labels={labels} />);
    const current = screen.getByText('3');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('calls onPageChange when a page button is clicked', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageCount={5} onPageChange={onPageChange} labels={labels} />);
    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('renders page controls as anchors when hrefFor is given', () => {
    render(
      <Pagination
        page={1}
        pageCount={3}
        onPageChange={vi.fn()}
        labels={labels}
        hrefFor={(p) => `/events?page=${p}`}
      />,
    );
    expect(screen.getByText('2').closest('a')).toHaveAttribute('href', '/events?page=2');
    expect(screen.getByLabelText('Próxima página').closest('a')).toHaveAttribute('href', '/events?page=2');
  });
});
