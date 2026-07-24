import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TicketSummaryCard } from './TicketSummaryCard';
import type { TicketProductResponse } from '@/features/events';

const baseTicket: TicketProductResponse = {
  id: 'tp-1',
  eventId: 'evt-1',
  name: 'Pista',
  description: '',
  price: 100,
  currency: 'BRL',
  capabilities: [],
  camerasLimit: null,
  allowedStageIds: [],
  capacity: null,
  remaining: null,
  soldOut: false,
  immutable: false,
};

describe('TicketSummaryCard', () => {
  it('renders BRL symbol for a BRL ticket', () => {
    render(<TicketSummaryCard ticket={baseTicket} quantity={1} />);
    expect(screen.getByText(/R\$/)).toBeInTheDocument();
  });

  it('renders the USD symbol (not BRL) for a USD ticket', () => {
    render(<TicketSummaryCard ticket={{ ...baseTicket, currency: 'USD' }} quantity={1} />);
    const price = screen.getByText(/US\$/);
    expect(price).toBeInTheDocument();
    expect(price.textContent).not.toContain('R$');
  });
});
