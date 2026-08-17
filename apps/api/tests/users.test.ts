import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";

jest.mock("../src/services/unifonic", () => ({
  sendOtpSms: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function loginAndGetAccessToken(phoneNumber: string): Promise<string> {
  await request(app).post("/api/auth/otp/request").send({ phoneNumber });
  const unifonic = await import("../src/services/unifonic");
  const code = (unifonic.sendOtpSms as jest.Mock).mock.calls.at(-1)![1] as string;
  const res = await request(app).post("/api/auth/otp/verify").send({ phoneNumber, code });
  return res.body.accessToken as string;
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("GET /api/users/me", () => {
  it("rejects requests without a bearer token", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("MISSING_TOKEN");
  });

  it("rejects an invalid token", async () => {
    const res = await request(app).get("/api/users/me").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("returns the authenticated user's profile", async () => {
    const token = await loginAndGetAccessToken("0512345678");
    const res = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.phoneNumber).toBe("+966512345678");
    expect(res.body.user.needsProfileSetup).toBe(true);
  });
});

describe("PUT /api/users/me", () => {
  it("completes profile setup: display name, city, and user type", async () => {
    const token = await loginAndGetAccessToken("0512345678");

    const region = await prisma.region.create({ data: { nameEn: "Riyadh", nameAr: "الرياض" } });
    const city = await prisma.city.create({ data: { nameEn: "Riyadh", nameAr: "الرياض", regionId: region.id } });

    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "Sara Al-Otaibi", cityId: city.id, userType: "BOTH" });

    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe("Sara Al-Otaibi");
    expect(res.body.user.city.nameEn).toBe("Riyadh");
    expect(res.body.user.userType).toBe("BOTH");
    expect(res.body.user.needsProfileSetup).toBe(false);
  });

  it("saves an uploaded profile photo URL", async () => {
    const token = await loginAndGetAccessToken("0512345678");
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ profilePhotoUrl: "https://cdn.encore.example/profile-photos/abc123.jpg" });

    expect(res.status).toBe(200);
    expect(res.body.user.profilePhotoUrl).toBe("https://cdn.encore.example/profile-photos/abc123.jpg");
  });

  it("rejects a non-URL profilePhotoUrl", async () => {
    const token = await loginAndGetAccessToken("0512345678");
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ profilePhotoUrl: "not-a-url" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an unknown cityId", async () => {
    const token = await loginAndGetAccessToken("0512345678");
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ cityId: "00000000-0000-0000-0000-000000000000" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_REFERENCE");
  });

  it("rejects an invalid userType value", async () => {
    const token = await loginAndGetAccessToken("0512345678");
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ userType: "NOT_A_TYPE" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/users/me/photo-upload-url", () => {
  it("returns a presigned S3 upload URL for a supported image type", async () => {
    const token = await loginAndGetAccessToken("0512345678");
    const res = await request(app)
      .post("/api/users/me/photo-upload-url")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toMatch(/^https:\/\//);
    expect(res.body.uploadUrl).toContain("encore-test-bucket");
    expect(res.body.publicUrl).toContain("cdn.encore.example");
  });

  it("rejects an unsupported content type", async () => {
    const token = await loginAndGetAccessToken("0512345678");
    const res = await request(app)
      .post("/api/users/me/photo-upload-url")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "application/pdf" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/regions", () => {
  it("lists regions with their nested cities", async () => {
    const region = await prisma.region.create({ data: { nameEn: "Makkah", nameAr: "مكة المكرمة" } });
    await prisma.city.create({ data: { nameEn: "Jeddah", nameAr: "جدة", regionId: region.id } });

    const res = await request(app).get("/api/regions");
    expect(res.status).toBe(200);
    expect(res.body.regions).toHaveLength(1);
    expect(res.body.regions[0].cities).toHaveLength(1);
    expect(res.body.regions[0].cities[0].nameEn).toBe("Jeddah");
  });
});
