import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProgramForm } from './useProgramForm';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'pt-BR',
}));

const upsertMutate = vi.fn();
const deleteMutate = vi.fn();
vi.mock('../mutations/channel.mutations', () => ({
  useUpsertProgramMutation: () => ({ mutate: upsertMutate, isPending: false }),
  useDeleteProgramMutation: () => ({ mutate: deleteMutate, isPending: false }),
}));

describe('useProgramForm', () => {
  beforeEach(() => {
    upsertMutate.mockReset();
  });

  it('submits latencyMode and recordingEnabled', () => {
    const { result } = renderHook(() =>
      useProgramForm({
        channelId: 'ch-1',
        slug: 'canal-um',
        organizationId: 'org-1',
        timezone: 'America/Sao_Paulo',
        onDone: vi.fn(),
      }),
    );

    act(() => {
      result.current.setName('Jornal');
      result.current.toggleDay('MO');
      result.current.setLatencyMode('LOW');
      result.current.setRecordingEnabled(false);
    });

    act(() => {
      result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    });

    expect(upsertMutate).toHaveBeenCalledWith(
      {
        input: expect.objectContaining({
          latencyMode: 'LOW',
          recordingEnabled: false,
        }),
        programId: undefined,
        slug: 'canal-um',
      },
      expect.anything(),
    );
  });

  it('defaults to STANDARD latency and recording enabled', () => {
    const { result } = renderHook(() =>
      useProgramForm({
        channelId: 'ch-1',
        slug: 'canal-um',
        organizationId: 'org-1',
        timezone: 'America/Sao_Paulo',
        onDone: vi.fn(),
      }),
    );

    expect(result.current.latencyMode).toBe('STANDARD');
    expect(result.current.recordingEnabled).toBe(true);
  });
});
