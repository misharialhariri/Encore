import { apiClient } from "./client";

export interface BankAccount {
  id: string;
  iban: string;
  bankName: string;
  accountHolderName: string;
  verified: boolean;
}

export interface Earnings {
  totalEarned: number;
  totalPaidOut: number;
  pendingPayouts: number;
  availableBalance: number;
}

export interface Payout {
  id: string;
  amount: number;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED";
  requestedAt: string;
  processedAt: string | null;
}

export async function getBankAccount(): Promise<BankAccount | null> {
  const { data } = await apiClient.get("/payouts/bank-account");
  return data.bankAccount;
}

export async function saveBankAccount(input: { iban: string; bankName: string; accountHolderName: string }): Promise<BankAccount> {
  const { data } = await apiClient.put("/payouts/bank-account", input);
  return data.bankAccount;
}

export async function getEarnings(): Promise<Earnings> {
  const { data } = await apiClient.get("/payouts/earnings");
  return data.earnings;
}

export async function getPayouts(): Promise<Payout[]> {
  const { data } = await apiClient.get("/payouts");
  return data.payouts;
}

export async function requestPayout(amount: number): Promise<Payout> {
  const { data } = await apiClient.post("/payouts", { amount });
  return data.payout;
}
