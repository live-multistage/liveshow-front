import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockIsLoggedIn = false;
const mockIsLoading = { value: false };
vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => ({ isLoggedIn: mockIsLoggedIn, isLoading: mockIsLoading.value }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Capture the onSuccess passed to the real hook and let the mock trigger it.
let capturedOnSuccess: (() => void) | undefined;
const mutate = vi.fn(() => capturedOnSuccess?.());
vi.mock('../hooks/use-create-organizer-application', () => ({
  useCreateOrganizerApplication: (onSuccess: () => void) => {
    capturedOnSuccess = onSuccess;
    return { mutate, isPending: false, error: null };
  },
}));

import { OrganizerApplicationContent } from './OrganizerApplicationPage';

describe('OrganizerApplicationContent', () => {
  beforeEach(() => {
    mockIsLoggedIn = true;
    mockIsLoading.value = false;
    capturedOnSuccess = undefined;
    mutate.mockClear();
  });

  it('reveals the free-text segment input when "Outro" is selected', async () => {
    render(<OrganizerApplicationContent />);
    expect(screen.queryByLabelText(/Descreva seu segmento/)).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/Segmento/), 'OTHER');

    expect(screen.getByLabelText(/Descreva seu segmento/)).toBeInTheDocument();
  });

  it('submits with customSegment for the OTHER case', async () => {
    render(<OrganizerApplicationContent />);

    await userEvent.selectOptions(screen.getByLabelText(/Segmento/), 'OTHER');
    await userEvent.type(screen.getByLabelText(/Descreva seu segmento/), 'Podcast');
    await userEvent.type(
      screen.getByLabelText(/Conte sobre você/),
      'Sou criador de conteúdo',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Enviar candidatura' }));

    expect(mutate).toHaveBeenCalledWith({
      description: 'Sou criador de conteúdo',
      segment: 'OTHER',
      customSegment: 'Podcast',
    });
  });

  it('submits without customSegment for a normal segment', async () => {
    render(<OrganizerApplicationContent />);

    await userEvent.selectOptions(screen.getByLabelText(/Segmento/), 'THEATER');
    await userEvent.type(screen.getByLabelText(/Conte sobre você/), 'Grupo de teatro');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar candidatura' }));

    expect(mutate).toHaveBeenCalledWith({
      description: 'Grupo de teatro',
      segment: 'THEATER',
    });
  });

  it('shows the pending-review success panel after a successful submit', async () => {
    render(<OrganizerApplicationContent />);

    await userEvent.selectOptions(screen.getByLabelText(/Segmento/), 'SPORTS');
    await userEvent.type(screen.getByLabelText(/Conte sobre você/), 'Eventos esportivos');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar candidatura' }));

    expect(screen.getByText('Recebemos sua candidatura')).toBeInTheDocument();
  });
});
