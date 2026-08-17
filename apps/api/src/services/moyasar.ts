import { randomUUID } from "node:crypto";
import { env, isProduction } from "../config/env";

const MOYASAR_API_BASE = "https://api.moyasar.com/v1";

export interface MoyasarInvoice {
  id: string;
  status: string;
  url: string | null;
}

interface MoyasarApiResponse {
  id?: string;
  status?: string;
  url?: string | null;
  message?: string;
}

export const moyasarConfigured = Boolean(env.MOYASAR_SECRET_KEY);

function authHeader(): string {
  return `Basic ${Buffer.from(`${env.MOYASAR_SECRET_KEY}:`).toString("base64")}`;
}

/**
 * Creates a Moyasar hosted-checkout Invoice — the buyer completes card /
 * Apple Pay / STC Pay on Moyasar's own page, so card data never touches
 * this server. Without MOYASAR_SECRET_KEY configured (local dev without a
 * merchant account), this returns a synthetic invoice with no URL; the
 * order flow then exposes a dev-only "simulate payment" action instead of
 * a real checkout link — mirroring how OTP SMS falls back to a console log.
 */
export async function createInvoice(amountSar: number, description: string, callbackUrl: string): Promise<MoyasarInvoice> {
  if (!moyasarConfigured) {
    if (isProduction) throw new Error("MOYASAR_SECRET_KEY is not configured");
    return { id: `dev_${randomUUID()}`, status: "initiated", url: null };
  }

  const response = await fetch(`${MOYASAR_API_BASE}/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      amount: Math.round(amountSar * 100), // halalas
      currency: "SAR",
      description,
      callback_url: callbackUrl,
    }),
  });

  const payload = (await response.json()) as MoyasarApiResponse;
  if (!response.ok) {
    throw new Error(`Moyasar invoice creation failed: ${payload.message ?? response.statusText}`);
  }

  return { id: payload.id!, status: payload.status!, url: payload.url ?? null };
}

export async function getInvoice(invoiceId: string): Promise<MoyasarInvoice> {
  if (invoiceId.startsWith("dev_")) {
    throw new Error("Cannot fetch a dev-mode invoice from Moyasar");
  }

  const response = await fetch(`${MOYASAR_API_BASE}/invoices/${invoiceId}`, {
    headers: { Authorization: authHeader() },
  });

  const payload = (await response.json()) as MoyasarApiResponse;
  if (!response.ok) {
    throw new Error(`Moyasar invoice lookup failed: ${payload.message ?? response.statusText}`);
  }

  return { id: payload.id!, status: payload.status!, url: payload.url ?? null };
}
