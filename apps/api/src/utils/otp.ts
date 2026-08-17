import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export function generateOtpCode(): string {
  // 6-digit code, zero-padded, generated with a CSPRNG.
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export function hashOtpCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export function compareOtpCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}
