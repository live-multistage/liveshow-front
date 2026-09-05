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

const ABOUT_40 = 'Liga amadora de vôlei com jogos toda quarta.'; // 44 chars

async function fillValidForm() {
  await userEvent.click(screen.getByRole('button', { name: /Esportes/ }));
  await userEvent.type(
    screen.getByPlaceholderText(/Liga Metropolitana de Vôlei/),
    'Liga Metropolitana de Vôlei',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Algumas vezes' }));
  await userEvent.type(screen.getByPlaceholderText(/Liga amadora de vôlei/), ABOUT_40);
}

describe('OrganizerApplicationContent', () => {
  beforeEach(() => {
    mockIsLoggedIn = true;
    mockIsLoading.value = false;
    capturedOnSuccess = undefined;
    mutate.mockClear();
  });

  it('keeps the submit button disabled until all four requirements are met', async () => {
    render(<OrganizerApplicationContent />);

    const submit = screen.getByRole('button', { name: /Preencha os campos obrigatórios/ });
    expect(submit).toBeDisabled();

    await fillValidForm();

    expect(
      screen.getByRole('button', { name: /Enviar candidatura/ }),
    ).toBeEnabled();
  });

  it('toggles a segment chip and an experience button', async () => {
    render(<OrganizerApplicationContent />);

    const chip = screen.getByRole('button', { name: /Esportes/ });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');

    const exp = screen.getByRole('button', { name: 'Regularmente' });
    expect(exp).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(exp);
    expect(exp).toHaveAttribute('aria-pressed', 'true');
  });

  it('submits the new body shape once every required field is filled', async () => {
    render(<OrganizerApplicationContent />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /Enviar candidatura/ }));

    expect(mutate).toHaveBeenCalledWith({
      organizationName: 'Liga Metropolitana de Vôlei',
      segments: ['SPORTS'],
      experience: 'SOME',
      about: ABOUT_40,
    });
  });

  it('shows the success card after a successful submit', async () => {
    render(<OrganizerApplicationContent />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /Enviar candidatura/ }));

    expect(screen.getByText('CANDIDATURA ENVIADA')).toBeInTheDocument();
    expect(
      screen.getByText('Recebemos, Liga Metropolitana de Vôlei.'),
    ).toBeInTheDocument();
  });
});
