import { apiClient } from "./client";

export interface AdminUserSummary {
  id: string;
  phoneNumber: string | null;
  email: string | null;
  displayName: string | null;
  userType: string | null;
  isVerified: boolean;
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  listingsCount: number;
  ordersAsBuyerCount: number;
  reportsFiledCount: number;
  reportsAgainstCount: number;
}

export async function searchUsers(query?: string): Promise<AdminUserSummary[]> {
  const { data } = await apiClient.get("/admin/users", { params: query ? { query } : undefined });
  return data.users;
}

export async function getUserDetail(id: string): Promise<AdminUserDetail> {
  const { data } = await apiClient.get(`/admin/users/${id}`);
  return data.user;
}

export async function suspendUser(id: string): Promise<AdminUserSummary> {
  const { data } = await apiClient.post(`/admin/users/${id}/suspend`);
  return data.user;
}

export async function banUser(id: string): Promise<AdminUserSummary> {
  const { data } = await apiClient.post(`/admin/users/${id}/ban`);
  return data.user;
}

export async function reactivateUser(id: string): Promise<AdminUserSummary> {
  const { data } = await apiClient.post(`/admin/users/${id}/reactivate`);
  return data.user;
}
