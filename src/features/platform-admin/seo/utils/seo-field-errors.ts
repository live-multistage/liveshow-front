import type { AppError } from '@/lib/http/errors';

// Maps the API's `errors: [{ field, message }]` (400 "Invalid SEO configuration") to { field: message }.
export function seoFieldErrors(error: AppError): Record<string, string> {
  if (!Array.isArray(error.details)) return {};
  const out: Record<string, string> = {};
  for (const item of error.details as { field?: unknown; message?: unknown }[]) {
    if (typeof item?.field === 'string' && typeof item.message === 'string' && !(item.field in out)) {
      out[item.field] = item.message;
    }
  }
  return out;
}
