import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BuyerDocumentField } from './BuyerDocumentField';

describe('BuyerDocumentField', () => {
  it('reports validity to the parent as the user types', () => {
    const onChange = vi.fn();
    render(<BuyerDocumentField value="" onChange={onChange} labels={{ label: 'CPF', hint: 'h', invalid: 'inv' }} />);
    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '529.982.247-25' } });
    expect(onChange).toHaveBeenLastCalledWith({ value: '529.982.247-25', valid: true });
    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '111' } });
    expect(onChange).toHaveBeenLastCalledWith({ value: '111', valid: false });
  });

  it('shows the invalid hint once the value is invalid', () => {
    render(<BuyerDocumentField value="111" onChange={vi.fn()} labels={{ label: 'CPF', hint: 'h', invalid: 'inv' }} />);
    expect(screen.getByText('inv')).toBeInTheDocument();
  });
});
