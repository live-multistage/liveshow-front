import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IngestCredentials } from './IngestCredentials';

const LONG_URL =
  'srt://192.168.18.155:8891?streamid=publish:cam_64622481ca6c26e008832c8440353aeb&latency=200&mode=caller' +
  '&extra=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

vi.mock('../queries/ingest.queries', () => ({
  useCameraIngestQuery: () => ({
    data: {
      streamKey: 'sk_abcdef123456',
      ingest: { url: LONG_URL, host: '192.168.18.155', port: 8891, latency: 200 },
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../mutations/ingest.mutations', () => ({
  useRegenerateCameraKeyMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('IngestCredentials', () => {
  it('renders the full SRT URL (150+ chars) with a copy action, not truncated', () => {
    render(<IngestCredentials cameraId="cam-1" />);

    fireEvent.click(screen.getByText('Credenciais OBS'));

    expect(LONG_URL.length).toBeGreaterThan(150);
    expect(screen.getByText(LONG_URL)).toBeDefined();
    expect(screen.getAllByTitle('Copiar').length).toBeGreaterThan(0);
  });
});
