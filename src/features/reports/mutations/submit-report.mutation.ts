'use client';

import { useMutation } from '@tanstack/react-query';
import { reportsService } from '../api/reports.service';
import { normalizeError, type AppError } from '@/lib/http/errors';
import type { SubmitReportInput, SubmitReportResponse } from '../types/report.types';

export function useSubmitReportMutation() {
  return useMutation<SubmitReportResponse, AppError, SubmitReportInput>({
    mutationFn: async (payload) => {
      try {
        return await reportsService.submit(payload);
      } catch (err) {
        throw normalizeError(err);
      }
    },
  });
}
