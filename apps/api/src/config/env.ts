import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("*"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be set to a long random value"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be set to a long random value"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  OTP_EXPIRY_MINUTES: z.coerce.number().default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(3),

  UNIFONIC_APP_SID: z.string().default(""),
  UNIFONIC_SENDER_ID: z.string().default("Encore"),

  AWS_REGION: z.string().default("me-south-1"),
  AWS_S3_BUCKET: z.string().default(""),
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
  AWS_S3_CDN_BASE_URL: z.string().default(""),

  GOOGLE_OAUTH_CLIENT_ID: z.string().default(""),
  APPLE_CLIENT_ID: z.string().default(""),

  MOYASAR_SECRET_KEY: z.string().default(""),
  API_PUBLIC_URL: z.string().default("http://localhost:4000"),

  // Firebase Cloud Messaging — service account credentials as a raw JSON
  // string (the whole downloaded key file, one line). Without it, push
  // sends fall back to a console log so notification logic stays testable.
  FCM_SERVICE_ACCOUNT_JSON: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
