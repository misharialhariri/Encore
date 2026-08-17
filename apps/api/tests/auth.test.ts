import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import * as unifonic from "../src/services/unifonic";

jest.mock("../src/services/unifonic", () => ({
  sendOtpSms: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();
const sendOtpSms = unifonic.sendOtpSms as jest.Mock;

async function requestAndCaptureOtp(phoneNumber: string): Promise<string> {
  sendOtpSms.mockClear();
  const res = await request(app).post("/api/auth/otp/request").send({ phoneNumber });
  expect(res.status).toBe(200);
  expect(sendOtpSms).toHaveBeenCalledTimes(1);
  return sendOtpSms.mock.calls[0][1] as string;
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("POST /api/auth/otp/request", () => {
  it("rejects a non-Saudi phone number", async () => {
    const res = await request(app).post("/api/auth/otp/request").send({ phoneNumber: "+1 555 123 4567" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts local (05...) and international (+966 5...) formats for the same number", async () => {
    const code1 = await requestAndCaptureOtp("0512345678");
    expect(code1).toMatch(/^\d{6}$/);

    const code2 = await requestAndCaptureOtp("+966512345678");
    expect(code2).toMatch(/^\d{6}$/);
  });

  it("invalidates the previous code when a new one is requested for the same number", async () => {
    const firstCode = await requestAndCaptureOtp("0512345678");
    const secondCode = await requestAndCaptureOtp("0512345678");
    expect(secondCode).not.toBe(firstCode);

    // The stale first code must no longer verify — only the newest code,
    // matched against the newest (still-pending) OTP row, is valid.
    const staleAttempt = await request(app)
      .post("/api/auth/otp/verify")
      .send({ phoneNumber: "0512345678", code: firstCode });
    expect(staleAttempt.status).toBe(400);
    expect(staleAttempt.body.error.code).toBe("INVALID_OTP");

    const freshAttempt = await request(app)
      .post("/api/auth/otp/verify")
      .send({ phoneNumber: "0512345678", code: secondCode });
    expect(freshAttempt.status).toBe(200);
  });
});

describe("POST /api/auth/otp/verify", () => {
  it("verifies a correct code, creates a user, and issues a token pair", async () => {
    const code = await requestAndCaptureOtp("0512345678");

    const res = await request(app).post("/api/auth/otp/verify").send({ phoneNumber: "0512345678", code });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.user.phoneNumber).toBe("+966512345678");
    expect(res.body.user.needsProfileSetup).toBe(true);

    const usersInDb = await prisma.user.count({ where: { phoneNumber: "+966512345678" } });
    expect(usersInDb).toBe(1);
  });

  it("reuses the existing user on a second login instead of creating a duplicate", async () => {
    const code1 = await requestAndCaptureOtp("0512345678");
    const first = await request(app).post("/api/auth/otp/verify").send({ phoneNumber: "0512345678", code: code1 });

    const code2 = await requestAndCaptureOtp("0512345678");
    const second = await request(app).post("/api/auth/otp/verify").send({ phoneNumber: "0512345678", code: code2 });

    expect(second.body.user.id).toBe(first.body.user.id);
    const usersInDb = await prisma.user.count({ where: { phoneNumber: "+966512345678" } });
    expect(usersInDb).toBe(1);
  });

  it("rejects an incorrect code without consuming the correct one", async () => {
    const code = await requestAndCaptureOtp("0512345678");

    const wrong = await request(app).post("/api/auth/otp/verify").send({ phoneNumber: "0512345678", code: "000000" });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe("INVALID_OTP");
    expect(wrong.body.error.details.attemptsRemaining).toBe(2);

    const right = await request(app).post("/api/auth/otp/verify").send({ phoneNumber: "0512345678", code });
    expect(right.status).toBe(200);
  });

  it("locks out after 3 incorrect attempts, even with the correct code on the 4th try", async () => {
    const code = await requestAndCaptureOtp("0512345678");

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post("/api/auth/otp/verify")
        .send({ phoneNumber: "0512345678", code: "000000" });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_OTP");
    }

    const lockedOut = await request(app).post("/api/auth/otp/verify").send({ phoneNumber: "0512345678", code });
    expect(lockedOut.status).toBe(429);
    expect(lockedOut.body.error.code).toBe("OTP_LOCKED");
  });

  it("rejects an expired code", async () => {
    const code = await requestAndCaptureOtp("0512345678");
    await prisma.otpVerification.updateMany({
      where: { phoneNumber: "+966512345678" },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await request(app).post("/api/auth/otp/verify").send({ phoneNumber: "0512345678", code });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("OTP_EXPIRED");
  });
});

describe("POST /api/auth/refresh", () => {
  it("issues a fresh token pair for a valid refresh token", async () => {
    const code = await requestAndCaptureOtp("0512345678");
    const login = await request(app).post("/api/auth/otp/verify").send({ phoneNumber: "0512345678", code });

    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.id).toBe(login.body.user.id);
  });

  it("rejects a malformed refresh token", async () => {
    const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "not-a-real-token" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });
});
