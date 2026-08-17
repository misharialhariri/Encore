import express from "express";
import request from "supertest";
import rateLimit from "express-rate-limit";

// The OTP rate limiter is skipped in NODE_ENV=test (see middleware/rateLimiter.ts)
// so the auth/users suites aren't flaky across many requests to the same
// phone number. This test exercises the exact same express-rate-limit
// configuration in isolation, without that test-only bypass, to prove the
// limiting behavior itself is correct.
function buildOtpLimitedApp() {
  const app = express();
  app.use(express.json());
  const otpRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 6,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (typeof req.body?.phoneNumber === "string" ? req.body.phoneNumber : req.ip ?? "unknown"),
    message: { error: { code: "RATE_LIMITED", message: "Too many OTP requests. Try again later." } },
  });
  app.post("/otp", otpRateLimiter, (_req, res) => res.json({ ok: true }));
  return app;
}

describe("OTP rate limiter", () => {
  it("allows up to the configured limit, then returns 429 for the same phone number", async () => {
    const app = buildOtpLimitedApp();

    for (let i = 0; i < 6; i++) {
      const res = await request(app).post("/otp").send({ phoneNumber: "0512345678" });
      expect(res.status).toBe(200);
    }

    const seventh = await request(app).post("/otp").send({ phoneNumber: "0512345678" });
    expect(seventh.status).toBe(429);
    expect(seventh.body.error.code).toBe("RATE_LIMITED");
  });

  it("tracks limits independently per phone number", async () => {
    const app = buildOtpLimitedApp();

    for (let i = 0; i < 6; i++) {
      await request(app).post("/otp").send({ phoneNumber: "0512345678" });
    }
    const blocked = await request(app).post("/otp").send({ phoneNumber: "0512345678" });
    expect(blocked.status).toBe(429);

    const otherNumber = await request(app).post("/otp").send({ phoneNumber: "0587654321" });
    expect(otherNumber.status).toBe(200);
  });
});
