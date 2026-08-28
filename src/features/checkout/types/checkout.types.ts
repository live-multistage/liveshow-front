import type {
  PaymentProvider,
  PaymentActionType,
  PaymentAction,
  PaymentMethod,
  PaymentMethodType,
  PaymentStatusResponse,
  PaymentStatus,
  OrderView,
  OrderLineView,
  OrderLineEventView,
  OrderStatus,
  PlaceOrderRequest,
  PlaceOrderResponse,
  ClaimFreeTicketRequest,
  ClaimFreeTicketResponse,
} from '@live-show/api-contracts';

export type {
  PaymentProvider,
  PaymentActionType,
  PaymentAction,
  PaymentMethod,
  PaymentMethodType,
  PaymentStatusResponse,
  PaymentStatus,
  OrderView,
  OrderLineView,
  OrderLineEventView,
  OrderStatus,
  PlaceOrderRequest,
  PlaceOrderResponse,
  ClaimFreeTicketRequest,
  ClaimFreeTicketResponse,
};

export interface CartCouponPreviewRequest {
  code: string;
  items: { eventId: string; amount: number }[];
}

export interface CartCouponPreviewResult {
  couponId: string;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  orgIds: string[];
  eventId: string | null;
  eligibleEventIds: string[];
}
