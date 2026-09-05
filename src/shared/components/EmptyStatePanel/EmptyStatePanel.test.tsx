import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyStatePanel } from './EmptyStatePanel';

describe('EmptyStatePanel', () => {
  it('renders the badge, title, text, primary CTA, and kinds grid', () => {
    render(
      <EmptyStatePanel
        illustration={<span>illustration</span>}
        badge="NENHUM FAVORITO"
        title="Você ainda não salvou nenhum evento"
        text="Toque no coração para guardá-lo aqui."
        primaryCta={{ href: '/events', label: 'Explorar programação' }}
        kindsLabel="COMO FUNCIONA"
        kinds={[
          { icon: <span>heart</span>, title: 'Salve com um toque', text: 'O coração aparece em todo poster.' },
          { icon: <span>bell</span>, title: 'Receba o aviso', text: 'Abertura de venda e início da transmissão.' },
        ]}
      />,
    );

    expect(screen.getByText('NENHUM FAVORITO')).toBeInTheDocument();
    expect(screen.getByText('Você ainda não salvou nenhum evento')).toBeInTheDocument();
    expect(screen.getByText('Toque no coração para guardá-lo aqui.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar programação' })).toHaveAttribute(
      'href',
      '/events',
    );
    expect(screen.getByText('COMO FUNCIONA')).toBeInTheDocument();
    expect(screen.getByText('Salve com um toque')).toBeInTheDocument();
    expect(screen.getByText('Receba o aviso')).toBeInTheDocument();
  });

  it('renders the optional secondary slot when provided', () => {
    render(
      <EmptyStatePanel
        illustration={<span>illustration</span>}
        badge="badge"
        title="title"
        text="text"
        primaryCta={{ href: '/events', label: 'cta' }}
        secondary={<button type="button">Avisar sobre novos eventos</button>}
        kindsLabel="kinds"
        kinds={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Avisar sobre novos eventos' })).toBeInTheDocument();
  });
});
