import { describe, it, expect, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('./SmartImage', () => ({
  SmartImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
// Tem suíte própria (auth, otimismo, a11y) e precisa de QueryClient; aqui só
// interessa que o card o monte com o id certo.
vi.mock('@/features/wishlist', () => ({
  WishlistButton: ({ eventId }: { eventId: string }) => (
    <button data-testid="wishlist-button" data-event-id={eventId} />
  ),
}));

import { render, screen } from '@testing-library/react';
import { EditorialCard } from './editorial-parts';
import { SHOWS } from '@/features/events/types/show';

describe('EditorialCard', () => {
  /**
   * Este é o card que a home realmente renderiza — não o HomePosterCard, que
   * nenhuma rota alcança. Se o coração sumir daqui, ele some da home inteira
   * e das páginas de gênero, que reusam o mesmo componente.
   */
  it('carries a wishlist toggle for its own event', () => {
    render(<EditorialCard show={SHOWS[0]} localeCode="pt-BR" />);

    expect(screen.getByTestId('wishlist-button')).toHaveAttribute('data-event-id', SHOWS[0].id);
  });

  it('still links the card through to the event', () => {
    render(<EditorialCard show={SHOWS[0]} localeCode="pt-BR" />);

    // O card tem três links: a capa inteira, "Assistir" (que vai para o
    // player) e "+ INFO". O primeiro é o do card, e é o que o coração não
    // pode sequestrar ao ser clicado.
    const [cardLink] = screen.getAllByRole('link');
    expect(cardLink).toHaveAttribute('href', `/events/${SHOWS[0].id}`);
  });
});
