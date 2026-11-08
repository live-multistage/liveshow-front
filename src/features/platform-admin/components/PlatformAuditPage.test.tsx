import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlatformAuditPage } from './PlatformAuditPage';
import { useAuditSearchQuery } from '../queries/get-audit';
import type { AuditLogEntry } from '../types/platform-admin.types';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('./PlatformPageShell', () => ({
  PlatformPageShell: ({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) => (
    <div>{actions}{children}</div>
  ),
}));
vi.mock('../queries/get-audit', () => ({ useAuditSearchQuery: vi.fn() }));

const CHROME_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const base: AuditLogEntry = {
  id: 'a1',
  actorUserId: 'u1',
  actorName: 'Ana Admin',
  action: 'ROLE_ASSIGNED',
  targetType: 'USER',
  targetId: 'u2',
  targetLabel: 'Bruno',
  metadata: null,
  createdAt: '2026-11-07T10:00:00.000Z',
};

function mockEntries(...items: AuditLogEntry[]) {
  vi.mocked(useAuditSearchQuery).mockReturnValue({
    data: { items, total: items.length, page: 1, limit: 25 },
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useAuditSearchQuery>);
}

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

describe('PlatformAuditPage — Origem', () => {
  it('shows IP and a summarized user-agent', () => {
    mockEntries({ ...base, ip: '203.0.113.7', userAgent: CHROME_MAC });
    render(<PlatformAuditPage />);

    expect(screen.getByText('203.0.113.7')).toBeInTheDocument();
    expect(screen.getByText('Chrome · macOS')).toBeInTheDocument();
  });

  it('shows an empty state for rows without origin (legacy or worker)', () => {
    mockEntries({ ...base, ip: null, userAgent: null });
    render(<PlatformAuditPage />);

    expect(screen.getByText('Origem não registrada')).toBeInTheDocument();
  });

  it('renders rows from an API that has no new fields at all', () => {
    mockEntries(base);
    render(<PlatformAuditPage />);

    expect(screen.getByText('Origem não registrada')).toBeInTheDocument();
    expect(screen.getByText('Ana Admin')).toBeInTheDocument();
  });
});

describe('PlatformAuditPage — impersonation', () => {
  it('flags rows done by an admin while impersonating', () => {
    mockEntries({ ...base, impersonator: { id: 'adm', name: 'Carla Super' } });
    render(<PlatformAuditPage />);

    expect(screen.getByText('via Carla Super')).toBeInTheDocument();
  });

  it('has no badge for ordinary rows', () => {
    mockEntries({ ...base, impersonator: null });
    render(<PlatformAuditPage />);

    expect(screen.queryByText(/^via /)).not.toBeInTheDocument();
  });

  it('still flags the row when the admin name is unknown', () => {
    mockEntries({ ...base, impersonator: { id: 'adm', name: null } });
    render(<PlatformAuditPage />);

    expect(screen.getByText('via admin')).toBeInTheDocument();
  });
});

describe('PlatformAuditPage — expandable detail', () => {
  const entry: AuditLogEntry = {
    ...base,
    action: 'ORG_MEMBER_ROLE_CHANGED',
    requestId: 'req-123',
    before: { role: 'MEMBER' },
    after: { role: 'ADMIN' },
  };

  it('hides the detail until the row is expanded', async () => {
    mockEntries(entry);
    render(<PlatformAuditPage />);

    expect(screen.queryByText('req-123')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /detalhes/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('req-123')).toBeInTheDocument();
  });

  it('lists before/after as campo: de → para', async () => {
    mockEntries(entry);
    render(<PlatformAuditPage />);
    await userEvent.click(screen.getByRole('button', { name: /detalhes/i }));

    const change = screen.getByRole('listitem');
    expect(within(change).getByText('Papel')).toBeInTheDocument();
    expect(within(change).getByText('MEMBER')).toBeInTheDocument();
    expect(within(change).getByText('ADMIN')).toBeInTheDocument();
  });

  it('copies the requestId', async () => {
    mockEntries(entry);
    render(<PlatformAuditPage />);
    await userEvent.click(screen.getByRole('button', { name: /detalhes/i }));
    await userEvent.click(screen.getByRole('button', { name: /copiar/i }));

    expect(writeText).toHaveBeenCalledWith('req-123');
    expect(await screen.findByText('Copiado')).toBeInTheDocument();
  });

  it('shows empty states for a null requestId and no changes', async () => {
    mockEntries({ ...base, requestId: null, before: null, after: null });
    render(<PlatformAuditPage />);
    await userEvent.click(screen.getByRole('button', { name: /detalhes/i }));

    expect(screen.getByText('Sem requestId')).toBeInTheDocument();
    expect(screen.getByText('Sem alterações registradas')).toBeInTheDocument();
  });

  it('shows the full user-agent in the detail', async () => {
    mockEntries({ ...base, userAgent: CHROME_MAC });
    render(<PlatformAuditPage />);
    await userEvent.click(screen.getByRole('button', { name: /detalhes/i }));

    expect(screen.getByText(CHROME_MAC)).toBeInTheDocument();
  });
});
