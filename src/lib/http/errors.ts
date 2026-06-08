import axios from 'axios';

export interface AppError {
  message: string;
  status: number;
  code?: string;
}

export function normalizeError(error: unknown): AppError {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.message ?? error.message,
      status: error.response?.status ?? 0,
      code: error.response?.data?.code,
    };
  }
  return { message: 'Unexpected error', status: 0 };
}
