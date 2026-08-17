// Mirrors the backend's Saudi mobile validation so the UI can flag an
// invalid number before it ever reaches the network.
const SAUDI_MOBILE_PATTERN = /^(?:\+?966|0)?5\d{8}$/;

export function normalizeSaudiPhone(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\s-]/g, "");
  if (!SAUDI_MOBILE_PATTERN.test(trimmed)) return null;
  const digitsOnly = trimmed.replace(/^\+?966|^0/, "");
  return `+966${digitsOnly}`;
}

export function formatSaudiPhoneForDisplay(e164: string): string {
  const digits = e164.replace("+966", "");
  return `+966 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}
