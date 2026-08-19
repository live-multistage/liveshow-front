import { describe, it, expect, vi } from 'vitest';
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketSection } from './TicketSection';
import { DEFAULT_CURRENCY } from '@/shared/constants/currencies';

describe('TicketSection currency selector', () => {
  it('renders the currency select and includes its value in the submitted ticket', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { container } = render(<TicketSection tickets={[]} onChange={onChange} />);

    // Selector renders with the DEFAULT_CURRENCY-backed field wired up.
    expect(screen.getByText('currencyLabel')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    const nameInput = container.querySelector('input[name="name"]') as HTMLInputElement;
    const descInput = container.querySelector('input[name="description"]') as HTMLInputElement;
    const priceInput = container.querySelector('input[name="price"]') as HTMLInputElement;
    const liveViewCheckbox = container.querySelector('input[name="liveView"]') as HTMLInputElement;

    await user.type(nameInput, 'VIP');
    await user.type(descInput, 'Acesso VIP completo');
    await user.type(priceInput, '100');
    await user.click(liveViewCheckbox);
    await user.click(screen.getByRole('button', { name: 'add' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));

    const [submittedTickets] = onChange.mock.calls[0];
    expect(submittedTickets).toHaveLength(1);
    expect(submittedTickets[0]).toMatchObject({
      name: 'VIP',
      currency: DEFAULT_CURRENCY,
    });
  });
});
