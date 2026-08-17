import request from "supertest";
import { createApp } from "../src/app";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, validListingPayload } from "./helpers";

jest.mock("../src/services/unifonic", () => ({
  sendOtpSms: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("GET /api/resellers/:id", () => {
  it("returns 404 for an unknown user", async () => {
    const res = await request(app).get("/api/resellers/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("returns the public profile with active listings, excluding paused ones", async () => {
    const token = await loginAndGetAccessToken(app, "0512345678");
    const meRes = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
    const resellerId = meRes.body.user.id;

    const activePayload = await validListingPayload({ title: "Active gown" });
    await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send(activePayload);

    const pausedPayload = await validListingPayload({ title: "Paused gown" });
    const paused = await request(app).post("/api/listings").set("Authorization", `Bearer ${token}`).send(pausedPayload);
    await request(app)
      .patch(`/api/listings/${paused.body.listing.id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "PAUSED" });

    const res = await request(app).get(`/api/resellers/${resellerId}`);
    expect(res.status).toBe(200);
    expect(res.body.reseller.activeListings).toHaveLength(1);
    expect(res.body.reseller.activeListings[0].title).toBe("Active gown");
    expect(res.body.reseller.totalSold).toBe(0);
    expect(res.body.reseller.averageRating).toBeNull();
  });
});
