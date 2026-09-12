import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IngestCredentials } from './IngestCredentials';

const LONG_URL =
  'srt://192.168.18.155:8891?streamid=publish:cam_64622481ca6c26e008832c8440353aeb&latency=200&mode=caller' +
  '&extra=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const R1_URL = 'srt://h:8890?streamid=publish:cam_1:publisher:abc123&latency=200&mode=caller';
const R1_URL_MASKED = 'srt://h:8890?streamid=publish:cam_1:publisher:••••••••&latency=200&mode=caller';

let ingestUrl = LONG_URL;

vi.mock('../queries/ingest.queries', () => ({
  useCameraIngestQuery: () => ({
    data: {
      streamKey: 'sk_abcdef123456',
      ingest: { url: ingestUrl, host: '192.168.18.155', port: 8891, latency: 200 },
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../mutations/ingest.mutations', () => ({
  useRegenerateCameraKeyMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe('IngestCredentials', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    ingestUrl = LONG_URL;
  });

  afterEach(() => {
    // The masking test replaces navigator.clipboard wholesale (jsdom doesn't
    // implement it) — restore it so a later test file/suite in the same
    // worker doesn't inherit this test's writeText mock.
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it('renders the full SRT URL (150+ chars) with a copy action, not truncated', () => {
    render(<IngestCredentials cameraId="cam-1" />);

    fireEvent.click(screen.getByText('Credenciais OBS'));

    expect(LONG_URL.length).toBeGreaterThan(150);
    expect(screen.getByText(LONG_URL)).toBeDefined();
    expect(screen.getAllByTitle('Copiar').length).toBeGreaterThan(0);
  });

  it('masks the publish secret in the displayed SRT URL but copies the full URL', async () => {
    ingestUrl = R1_URL;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<IngestCredentials cameraId="cam-1" />);
    fireEvent.click(screen.getByText('Credenciais OBS'));

    expect(screen.getByText(R1_URL_MASKED)).toBeDefined();
    expect(screen.queryByText(R1_URL)).toBeNull();

    fireEvent.click(screen.getAllByTitle('Copiar')[0]);
    expect(writeText).toHaveBeenCalledWith(R1_URL);
  });
});
