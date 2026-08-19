import { httpClient } from '@/lib/http/client';
import type { SubmitReportInput, SubmitReportResponse } from '../types/report.types';

export const reportsService = {
  submit: async (input: SubmitReportInput): Promise<SubmitReportResponse> => {
    const { data } = await httpClient.post<SubmitReportResponse>('/reports', input);
    return data;
  },
};
