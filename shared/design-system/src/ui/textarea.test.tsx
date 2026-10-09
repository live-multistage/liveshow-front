import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('shows a live length/max counter when uncontrolled', () => {
    render(<Textarea max={160} defaultValue="abc" aria-label="t" />);
    expect(screen.getByText('3/160')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('t'), { target: { value: 'abcdef' } });
    expect(screen.getByText('6/160')).toBeInTheDocument();
  });

  it('follows the value when controlled and does not block going over max', () => {
    render(<Textarea max={3} value="abcd" onChange={() => {}} aria-label="t" />);
    expect(screen.getByText('4/3')).toBeInTheDocument();
    expect(screen.getByLabelText('t')).not.toHaveAttribute('aria-invalid');
  });

  it('renders no counter without max', () => {
    render(<Textarea aria-label="t" defaultValue="abc" />);
    expect(screen.queryByText(/\//)).not.toBeInTheDocument();
  });

  it('shows the error message and marks the field invalid', () => {
    render(<Textarea aria-label="t" error="Campo obrigatório." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório.');
    expect(screen.getByLabelText('t')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('t')).toHaveAccessibleDescription('Campo obrigatório.');
  });

  it('supports disabled', () => {
    render(<Textarea aria-label="t" disabled mono />);
    expect(screen.getByLabelText('t')).toBeDisabled();
  });
});
