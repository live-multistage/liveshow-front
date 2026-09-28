import type { TrackingBatchRequest } from '@live-show/api-contracts';

export type SendResult = 'ok' | 'retry' | 'drop';

export interface Transport {
  send(body: TrackingBatchRequest, opts: { keepalive: boolean }): Promise<SendResult>;
}

export function createFetchTransport(o: {
  endpoint: string;
  getAuthToken?: () => string | null;
  fetchImpl?: typeof fetch;
}): Transport {
  const fetchImpl = o.fetchImpl ?? fetch;

  return {
    async send(body, opts) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = o.getAuthToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;

      let res: Response;
      try {
        res = await fetchImpl(`${o.endpoint}/v1/t/batch`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          keepalive: opts.keepalive,
        });
      } catch {
        return 'retry';
      }

      if (res.status >= 200 && res.status < 300) return 'ok';
      if (res.status === 429 || res.status >= 500) return 'retry';
      return 'drop';
    },
  };
}
