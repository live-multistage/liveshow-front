import { describe, it, expect, vi } from 'vitest';
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('./SmartImage', () => ({
  SmartImage: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  ),
}));
import { render, screen } from '@testing-library/react';
import { EditorialHero } from './EditorialHero';
import type { Show, Camera } from '@/features/events/types/show';

const cameras: Camera[] = [
  { id: 'cam1', name: 'Cam 1', angle: 'Front', color: '#fff', gradient: 'x' },
  { id: 'cam2', name: 'Cam 2', angle: 'Side', color: '#fff', gradient: 'x' },
  { id: 'cam3', name: 'Cam 3', angle: 'Top', color: '#fff', gradient: 'x' },
];

const baseShow: Show = {
  id: 'show-1',
  title: 'Noite do Forró',
  artist: 'Trio Nordestino',
  category: 'Forró',
  venue: 'Forró do Vaqueiro',
  city: 'Recife, PE',
  country: 'Brasil',
  date: '2026-08-10',
  time: '20:00',
  duration: '2h',
  image: 'https://example.com/forro.jpg',
  price: 0,
  currency: 'BRL',
  isLive: true,
  hasReplay: true,
  cameras,
  description: 'desc',
  tags: [],
  viewers: 24381,
};

describe('EditorialHero', () => {
  it('renders live show with badge, watching count, meta, and primary + secondary CTAs', () => {
    render(<EditorialHero featured={baseShow} localeCode="pt-BR" />);

    expect(screen.getByText('Noite do Forró')).toBeInTheDocument();
    expect(screen.getByText('AO VIVO')).toBeInTheDocument();
    expect(screen.getByText('24.381')).toBeInTheDocument();
    expect(screen.getByText('assistindo agora')).toBeInTheDocument();
    expect(screen.getByText('3 câmeras')).toBeInTheDocument();
    expect(screen.getByText('Dolby Atmos')).toBeInTheDocument();

    const primary = screen.getByRole('link', { name: /assistir agora/i });
    expect(primary).toHaveAttribute('href', '/live/show-1');

    const secondary = screen.getByRole('link', { name: /detalhes/i });
    expect(secondary).toHaveAttribute('href', '/events/show-1');
  });

  it('renders a single events CTA and no AO VIVO/Assistir/Detalhes when not live', () => {
    const notLive: Show = { ...baseShow, isLive: false };
    render(<EditorialHero featured={notLive} localeCode="pt-BR" />);

    expect(screen.queryByText('AO VIVO')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /assistir agora/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /detalhes/i })).not.toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/events/show-1');
  });
});
