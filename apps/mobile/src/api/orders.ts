import { apiClient } from "./client";

export type OrderStatus = "PLACED" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "COMPLETED" | "CANCELLED" | "DISPUTED";
export type DeliveryMethod = "SHIPPING" | "MEETUP";

export interface Order {
  id: string;
  status: OrderStatus;
  listing: { id: string; title: string; coverImageUrl: string | null };
  buyer: { id: string; displayName: string | null; profilePhotoUrl: string | null; phoneNumber: string | null };
  reseller: { id: string; displayName: string | null; profilePhotoUrl: string | null; phoneNumber: string | null };
  itemPrice: number;
  shippingFee: number;
  platformFee: number;
  totalAmount: number;
  deliveryMethod: DeliveryMethod;
  address: { id: string; label: string; district: string; street: string; city: string } | null;
  meetupLat: number | null;
  meetupLng: number | null;
  meetupDescription: string | null;
  trackingNumber: string | null;
  courierName: string | null;
  estimatedDeliveryDate: string | null;
  payment: { status: string; escrowStatus: string; method: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  listingId: string;
  offerId?: string;
  deliveryMethod: DeliveryMethod;
  addressId?: string;
  meetupLat?: number;
  meetupLng?: number;
  meetupDescription?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { data } = await apiClient.post("/orders", input);
  return data.order;
}

export async function getMyOrders(status?: OrderStatus): Promise<Order[]> {
  const { data } = await apiClient.get("/orders/mine", { params: status ? { status } : undefined });
  return data.orders;
}

export async function getSellingOrders(status?: OrderStatus): Promise<Order[]> {
  const { data } = await apiClient.get("/orders/selling", { params: status ? { status } : undefined });
  return data.orders;
}

export async function getOrder(id: string): Promise<Order> {
  const { data } = await apiClient.get(`/orders/${id}`);
  return data.order;
}

export async function checkout(id: string): Promise<{ checkoutUrl: string | null; devMode: boolean; invoiceId: string }> {
  const { data } = await apiClient.post(`/orders/${id}/checkout`);
  return data;
}

export async function refreshPaymentStatus(id: string): Promise<{ applied: boolean }> {
  const { data } = await apiClient.post(`/orders/${id}/refresh-payment-status`);
  return data;
}

export async function devSimulatePayment(id: string): Promise<{ applied: boolean }> {
  const { data } = await apiClient.post(`/orders/${id}/dev-simulate-payment`);
  return data;
}

export async function confirmOrder(id: string): Promise<Order> {
  const { data } = await apiClient.post(`/orders/${id}/confirm`);
  return data.order;
}

export async function shipOrder(id: string, input: { trackingNumber: string; courierName: string; estimatedDeliveryDate?: string }): Promise<Order> {
  const { data } = await apiClient.post(`/orders/${id}/ship`, input);
  return data.order;
}

export async function markDelivered(id: string): Promise<Order> {
  const { data } = await apiClient.post(`/orders/${id}/deliver`);
  return data.order;
}

export async function confirmReceipt(id: string): Promise<Order> {
  const { data } = await apiClient.post(`/orders/${id}/confirm-receipt`);
  return data.order;
}
