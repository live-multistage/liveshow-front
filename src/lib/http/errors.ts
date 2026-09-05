import axios from 'axios';

export interface AppError {
  message: string;
  status: number;
  code?: string;
  // Correlates this failure with the API/nginx logs. The server echoes back
  // whatever id we sent as X-Request-Id (see request-id.ts + interceptors.ts);
  // falls back to the header we sent when the response never arrived at all
  // (network error, timeout) and there's no body to read one from.
  requestId?: string;
}

export function normalizeError(error: unknown): AppError {
  if (axios.isAxiosError(error)) {
    const sentRequestId = error.config?.headers?.['X-Request-Id'] as string | undefined;
    const requestId = (error.response?.data as { requestId?: string } | undefined)?.requestId ?? sentRequestId;

    const appError: AppError = {
      message: error.response?.data?.message ?? error.message,
      status: error.response?.status ?? 0,
      code: error.response?.data?.code,
      ...(requestId ? { requestId } : {}),
    };
    // Never log the raw axios error: it carries config.headers.Authorization
    // and config.data, which can hold request bodies with PII/credentials.
    console.error('[http error]', appError, { url: error.config?.url, message: error.message });
    return appError;
  }
  console.error('[http error] Unexpected error', error);
  return { message: 'Unexpected error', status: 0 };
}
