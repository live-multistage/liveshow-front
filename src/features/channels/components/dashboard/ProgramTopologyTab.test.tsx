import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgramTopologyTab } from './ProgramTopologyTab';

const mutate = vi.fn();
let streamsQueryResult: { data: unknown[]; isLoading: boolean } = { data: [], isLoading: false };

vi.mock('@/features/streams', () => ({
  useProgramStreamsQuery: () => streamsQueryResult,
  useCreateProgramStreamMutation: () => ({ mutate, isPending: false }),
  StreamBuilder: ({ stream }: { stream: { title: string } }) => <div>builder:{stream.title}</div>,
}));

vi.mock('@live-show/design-system', () => ({
  Button: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
  Skeleton: (props: React.ComponentProps<'div'>) => <div data-testid="skeleton" {...props} />,
}));

describe('ProgramTopologyTab', () => {
  it('renders the StreamBuilder when a stream already exists', () => {
    streamsQueryResult = { data: [{ id: 's1', title: 'Estúdio Principal' }], isLoading: false };

    render(<ProgramTopologyTab programId="p1" programName="Programa X" />);

    expect(screen.getByText('builder:Estúdio Principal')).toBeInTheDocument();
  });

  it('shows a create button and triggers the mutation when there is no stream yet', () => {
    streamsQueryResult = { data: [], isLoading: false };

    render(<ProgramTopologyTab programId="p1" programName="Programa X" />);

    const button = screen.getByRole('button', { name: /criar estúdio/i });
    fireEvent.click(button);

    expect(mutate).toHaveBeenCalledWith({ title: 'Programa X' });
  });
});
