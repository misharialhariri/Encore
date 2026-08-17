import { apiClient } from "./client";

export type OfferStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "COUNTERED" | "EXPIRED";

export interface Offer {
  id: string;
  offerPrice: number;
  status: OfferStatus;
  parentOfferId: string | null;
  expiresAt: string;
  createdAt: string;
  buyerId: string;
  listing: {
    id: string;
    title: string;
    askingPrice: number;
    status: string;
    resellerId: string;
    coverImageUrl: string | null;
  };
}

export interface OfferDetail extends Offer {
  isMyTurn: boolean;
  history: Offer[];
}

export async function createOffer(listingId: string, offerPrice: number): Promise<Offer> {
  const { data } = await apiClient.post("/offers", { listingId, offerPrice });
  return data.offer;
}

export async function getMyOffers(): Promise<Offer[]> {
  const { data } = await apiClient.get("/offers/mine");
  return data.offers;
}

export async function getReceivedOffers(): Promise<Offer[]> {
  const { data } = await apiClient.get("/offers/received");
  return data.offers;
}

export async function getOffer(id: string): Promise<OfferDetail> {
  const { data } = await apiClient.get(`/offers/${id}`);
  return data.offer;
}

export async function acceptOffer(id: string): Promise<Offer> {
  const { data } = await apiClient.post(`/offers/${id}/accept`);
  return data.offer;
}

export async function declineOffer(id: string): Promise<Offer> {
  const { data } = await apiClient.post(`/offers/${id}/decline`);
  return data.offer;
}

export async function counterOffer(id: string, offerPrice: number): Promise<Offer> {
  const { data } = await apiClient.post(`/offers/${id}/counter`, { offerPrice });
  return data.offer;
}
