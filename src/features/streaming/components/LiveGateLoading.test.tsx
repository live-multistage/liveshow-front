import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LiveGateLoading } from './LiveGateLoading';

describe('LiveGateLoading', () => {
  it('announces the message and event title', () => {
    render(<LiveGateLoading message="Carregando transmissão" eventTitle="Show X" />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando transmissão');
    expect(screen.getByRole('heading', { name: 'Show X' })).toBeInTheDocument();
  });
});
