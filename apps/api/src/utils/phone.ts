// Saudi mobile numbers: +966 5XXXXXXXX (9 digits after the country code,
// starting with 5). Accepts local (05XXXXXXXX) or international input and
// always normalizes to E.164 (+9665XXXXXXXX).
const SAUDI_MOBILE_PATTERN = /^(?:\+?966|0)?5\d{8}$/;

export function normalizeSaudiPhone(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\s-]/g, "");
  if (!SAUDI_MOBILE_PATTERN.test(trimmed)) return null;

  const digitsOnly = trimmed.replace(/^\+?966|^0/, "");
  return `+966${digitsOnly}`;
}
