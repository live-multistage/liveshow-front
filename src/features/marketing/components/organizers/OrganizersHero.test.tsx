import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const MOCK_CAMS = [
  { name: 'Câmera principal', meta: 'WIDE · 1080p' },
  { name: 'Quadra · lateral', meta: 'TRIPÉ · 1080p' },
  { name: 'Banco / técnico', meta: 'PTZ · 720p' },
  { name: 'Torcida', meta: 'GIMBAL · 1080p' },
];

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    t.raw = (key: string) => (key === 'hero.mock.cams' ? MOCK_CAMS : []);
    return t;
  },
}));

vi.mock('@/features/account/hooks/use-auth', () => ({
  useAuth: () => ({ isLoggedIn: false }),
}));

import { OrganizersHero } from './OrganizersHero';

describe('OrganizersHero', () => {
  it('renders the hero heading and the four camera buttons', () => {
    render(<OrganizersHero />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    const camButtons = MOCK_CAMS.map((cam) => screen.getByRole('button', { name: new RegExp(cam.name) }));
    expect(camButtons).toHaveLength(4);
  });

  it('marks a clicked camera as active and updates the displayed code', () => {
    render(<OrganizersHero />);

    const secondCam = screen.getByRole('button', { name: new RegExp(MOCK_CAMS[1].name) });
    expect(secondCam).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(secondCam);

    expect(secondCam).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('CAM 2')).toBeInTheDocument();
  });
});
