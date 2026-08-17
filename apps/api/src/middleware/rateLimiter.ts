import rateLimit from "express-rate-limit";
import { isTest } from "../config/env";

// General API traffic: generous, just guards against runaway clients.
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests. Please slow down." } },
});

// OTP request/verify: tight, since each call sends an SMS or checks a
// guessable code. Keyed by phone number when present so one number can't
// be hammered from rotating IPs, falling back to IP otherwise.
export const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  keyGenerator: (req) => (typeof req.body?.phoneNumber === "string" ? req.body.phoneNumber : req.ip ?? "unknown"),
  message: { error: { code: "RATE_LIMITED", message: "Too many OTP requests. Try again later." } },
});
