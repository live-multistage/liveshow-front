export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface CouponResponse {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  eventId: string | null;
  orgIds: string[];
  minOrderAmount: number | null;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponRequest {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  orgIds: string[];
  eventId?: string;
  minOrderAmount?: number;
  maxUses?: number;
  expiresAt?: string;
}

export interface UpdateCouponRequest {
  discountType?: DiscountType;
  discountValue?: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  expiresAt?: string | null;
}

export interface CouponUsage {
  orderId: string;
  userId: string;
  usedAt: string;
  discountAmount: number;
}
