'use client';

import axios from 'axios';
import { config } from '@/config';
import { applyInterceptors } from './interceptors';

export const httpClient = axios.create({
  baseURL: config.apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

applyInterceptors(httpClient);
