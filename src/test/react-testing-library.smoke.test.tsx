import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Smoke test: proves the component-testing chain (jsdom environment +
// @testing-library/react render/query + @testing-library/jest-dom matchers)
// is wired correctly, so real component tests can be written from here.
describe('react-testing-library setup', () => {
  it('renders a component and queries it by role', () => {
    render(<button type="button">Encerrar</button>);
    expect(screen.getByRole('button', { name: 'Encerrar' })).toBeInTheDocument();
  });
});
