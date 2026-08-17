import { apiClient } from "./client";

export interface Address {
  id: string;
  label: string;
  district: string;
  street: string;
  city: { id: string; nameEn: string; nameAr: string; region: { nameEn: string } };
}

export async function getAddresses(): Promise<Address[]> {
  const { data } = await apiClient.get("/addresses");
  return data.addresses;
}

export async function createAddress(input: { label: string; cityId: string; district: string; street: string }): Promise<Address> {
  const { data } = await apiClient.post("/addresses", input);
  return data.address;
}

export async function deleteAddress(id: string): Promise<void> {
  await apiClient.delete(`/addresses/${id}`);
}
