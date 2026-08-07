import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

import { render, screen, fireEvent, act } from '@testing-library/react';
import { EditorialHero } from './EditorialHero';
import type { Show, Camera } from '../../../types/show';

const cameras: Camera[] = [
  { id: 'cam1', name: 'Cam 1', angle: 'Front', color: '#fff', gradient: 'x' },
];

function makeShow(overrides: Partial<Show>): Show {
  return {
    id: 'show-1',
    title: 'Slide One',
    artist: 'Artist',
    category: 'Rock',
    venue: 'Arena',
    city: 'City',
    country: 'Brasil',
    date: '2026-08-10',
    time: '20:00',
    duration: '2h',
    image: 'https://example.com/img.jpg',
    price: 0,
    currency: 'BRL',
    isLive: true,
    hasReplay: true,
    cameras,
    description: 'desc',
    tags: [],
    viewers: 100,
    ...overrides,
  };
}

const slide1 = makeShow({ id: 's1', title: 'Slide One' });
const slide2 = makeShow({ id: 's2', title: 'Slide Two' });
const slide3 = makeShow({ id: 's3', title: 'Slide Three' });

describe('EditorialHero', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('multi-slide', () => {
    it('renders one dot per slide and shows the first slide title', () => {
      render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      expect(screen.getAllByRole('button', { name: /Ir para o slide/i })).toHaveLength(3);
      expect(screen.getByRole('heading', { name: 'Slide One' })).toBeInTheDocument();
    });

    it('clicking a dot switches the active slide', () => {
      render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 3/i });
      fireEvent.click(dot2);

      expect(dot2).toHaveAttribute('aria-current', 'true');
    });

    it('advances automatically after 7s', () => {
      render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      const dot2 = screen.getByRole('button', { name: /Ir para o slide 2 de 3/i });
      expect(dot2).toHaveAttribute('aria-current', 'false');

      act(() => vi.advanceTimersByTime(7000));

      expect(dot2).toHaveAttribute('aria-current', 'true');
    });

    it('pauses autoplay on hover', () => {
      const { container } = render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      const hero = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(hero);

      act(() => vi.advanceTimersByTime(7000));

      const dot1 = screen.getByRole('button', { name: /Ir para o slide 1 de 3/i });
      expect(dot1).toHaveAttribute('aria-current', 'true');
    });
  });

  describe('single-slide', () => {
    it('renders no dot buttons and does not autoplay', () => {
      render(<EditorialHero slides={[slide1]} localeCode="pt-BR" />);

      expect(screen.queryAllByRole('button', { name: /Ir para o slide/i })).toHaveLength(0);
      expect(screen.getByText('Slide One')).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(7000));

      expect(screen.getByText('Slide One')).toBeInTheDocument();
    });
  });

  describe('reduced motion', () => {
    it('disables autoplay when prefers-reduced-motion is set', () => {
      window.matchMedia = vi.fn().mockImplementation((q: string) => ({
        matches: q.includes('reduce'),
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }));

      render(<EditorialHero slides={[slide1, slide2, slide3]} localeCode="pt-BR" />);

      act(() => vi.advanceTimersByTime(7000));

      const dot1 = screen.getByRole('button', { name: /Ir para o slide 1 de 3/i });
      expect(dot1).toHaveAttribute('aria-current', 'true');
    });
  });
});
