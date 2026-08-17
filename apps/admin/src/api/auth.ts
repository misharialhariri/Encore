import { apiClient } from "./client";

export type AdminRole = "SUPER_ADMIN" | "OPS" | "FINANCE" | "SUPPORT";

export interface Admin {
  id: string;
  email: string;
  role: AdminRole;
  createdAt: string;
}

export async function login(email: string, password: string): Promise<{ accessToken: string; admin: Admin }> {
  const { data } = await apiClient.post("/admin/auth/login", { email, password });
  return data;
}

export async function getMe(): Promise<Admin> {
  const { data } = await apiClient.get("/admin/auth/me");
  return data.admin;
}
