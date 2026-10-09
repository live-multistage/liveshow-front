import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tabs } from './tabs';

const items = [
  { value: 'pt', label: 'PT', badge: 'obrigatório' },
  { value: 'en', label: 'EN', dot: true, dotLabel: 'changed' },
  { value: 'es', label: 'ES' },
];

describe('Tabs', () => {
  it('exposes tablist/tab/tabpanel with the first tab selected by default', () => {
    render(<Tabs items={items} label="Idioma">{(v) => <p>panel {v}</p>}</Tabs>);
    expect(screen.getByRole('tablist', { name: 'Idioma' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /PT/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('panel pt');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', screen.getByRole('tab', { name: /PT/ }).id);
  });

  it('works uncontrolled: clicking switches the active tab', () => {
    const onValueChange = vi.fn();
    render(<Tabs items={items} label="Idioma" onValueChange={onValueChange}>{(v) => <p>panel {v}</p>}</Tabs>);
    fireEvent.click(screen.getByRole('tab', { name: /ES/ }));
    expect(onValueChange).toHaveBeenCalledWith('es');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('panel es');
  });

  it('is controlled when value is given', () => {
    render(<Tabs items={items} label="Idioma" value="en" onValueChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: /ES/ }));
    expect(screen.getByRole('tab', { name: /EN/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves focus with arrow keys (wrapping) and does not activate until Enter/click', () => {
    render(<Tabs items={items} label="Idioma" />);
    const pt = screen.getByRole('tab', { name: /PT/ });
    pt.focus();
    fireEvent.keyDown(pt, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: /ES/ })).toHaveFocus();
    expect(pt).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tab', { name: /ES/ }), { key: 'ArrowRight' });
    expect(pt).toHaveFocus();
  });

  it('renders the badge and the changed dot', () => {
    render(<Tabs items={items} label="Idioma" />);
    expect(screen.getByText('obrigatório')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'changed' })).toBeInTheDocument();
  });

  it('keeps only the active tab in the tab order', () => {
    render(<Tabs items={items} label="Idioma" />);
    expect(screen.getByRole('tab', { name: /EN/ })).toHaveAttribute('tabindex', '-1');
  });
});
