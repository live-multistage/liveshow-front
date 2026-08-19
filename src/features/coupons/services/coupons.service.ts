import { httpClient } from '@/lib/http/client';
import type { CouponResponse, CreateCouponRequest, UpdateCouponRequest, CouponUsage } from '../types/coupon.types';

export const couponsService = {
  list: async (params: { orgId?: string; eventId?: string } = {}): Promise<CouponResponse[]> => {
    const { data } = await httpClient.get<CouponResponse[]>('/coupons', { params });
    return data;
  },

  getOne: async (id: string): Promise<CouponResponse> => {
    const { data } = await httpClient.get<CouponResponse>(`/coupons/${id}`);
    return data;
  },

  create: async (payload: CreateCouponRequest): Promise<CouponResponse> => {
    const { data } = await httpClient.post<CouponResponse>('/coupons', payload);
    return data;
  },

  update: async (id: string, payload: UpdateCouponRequest): Promise<CouponResponse> => {
    const { data } = await httpClient.patch<CouponResponse>(`/coupons/${id}`, payload);
    return data;
  },

  deactivate: async (id: string): Promise<void> => {
    await httpClient.delete(`/coupons/${id}`);
  },

  activate: async (id: string): Promise<void> => {
    await httpClient.post(`/coupons/${id}/activate`);
  },

  usages: async (id: string): Promise<CouponUsage[]> => {
    const { data } = await httpClient.get<CouponUsage[]>(`/coupons/${id}/usages`);
    return data;
  },
};
