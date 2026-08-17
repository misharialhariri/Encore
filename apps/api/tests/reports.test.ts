import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, createListingDirect } from "./helpers";

jest.mock("../src/services/unifonic", () => ({
  sendOtpSms: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function makeReseller(phone: string) {
  const token = await loginAndGetAccessToken(app, phone);
  const me = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
  return { token, id: me.body.user.id as string };
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("POST /api/reports", () => {
  it("requires auth", async () => {
    const res = await request(app).post("/api/reports").send({ targetType: "LISTING", reason: "SCAM" });
    expect(res.status).toBe(401);
  });

  it("creates a listing report", async () => {
    const reseller = await makeReseller("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeReseller("0587654321");

    const res = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ targetType: "LISTING", listingId: listing.id, reason: "FAKE_PHOTOS", description: "Photos don't match the item" });

    expect(res.status).toBe(201);
    expect(res.body.report.status).toBe("OPEN");

    const dbReport = await prisma.report.findUniqueOrThrow({ where: { id: res.body.report.id } });
    expect(dbReport.reporterId).toBe(buyer.id);
    expect(dbReport.listingId).toBe(listing.id);
  });

  it("creates a user report", async () => {
    const reseller = await makeReseller("0512345678");
    const buyer = await makeReseller("0587654321");

    const res = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ targetType: "USER", reportedUserId: reseller.id, reason: "HARASSMENT" });

    expect(res.status).toBe(201);
  });

  it("rejects a LISTING report without a listingId", async () => {
    const buyer = await makeReseller("0587654321");
    const res = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ targetType: "LISTING", reason: "SCAM" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
