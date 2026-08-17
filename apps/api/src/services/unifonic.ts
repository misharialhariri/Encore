import { env, isProduction } from "../config/env";

const UNIFONIC_SMS_ENDPOINT = "https://el.cloud.unifonic.com/rest/SMS/messages";

/**
 * Sends an OTP SMS through Unifonic. If no App SID is configured (e.g. a
 * fresh local checkout without production credentials), the code is logged
 * instead of sent so the OTP flow stays exercisable end-to-end; with a real
 * UNIFONIC_APP_SID set, this always calls the live API.
 */
export async function sendOtpSms(phoneNumber: string, code: string): Promise<void> {
  const body = `Encore verification code: ${code}. It expires in ${env.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;

  if (!env.UNIFONIC_APP_SID) {
    if (isProduction) {
      throw new Error("UNIFONIC_APP_SID is not configured");
    }
    console.log(`[dev-sms] Unifonic App SID not set — would send to ${phoneNumber}: "${body}"`);
    return;
  }

  const params = new URLSearchParams({
    AppSid: env.UNIFONIC_APP_SID,
    SenderID: env.UNIFONIC_SENDER_ID,
    Body: body,
    Recipient: phoneNumber.replace(/^\+/, ""),
    responseType: "JSON",
  });

  const response = await fetch(UNIFONIC_SMS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const payload = (await response.json().catch(() => null)) as { success?: boolean; message?: string } | null;

  if (!response.ok || payload?.success === false) {
    throw new Error(`Unifonic SMS send failed: ${payload?.message ?? response.statusText}`);
  }
}
