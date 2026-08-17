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

describe("wishlist", () => {
  it("requires auth on all routes", async () => {
    expect((await request(app).get("/api/wishlist")).status).toBe(401);
    expect((await request(app).post("/api/wishlist/some-id")).status).toBe(401);
    expect((await request(app).delete("/api/wishlist/some-id")).status).toBe(401);
  });

  it("returns 404 when saving a listing that does not exist", async () => {
    const buyer = await makeReseller("0587654321");
    const res = await request(app)
      .post("/api/wishlist/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(res.status).toBe(404);
  });

  it("adds a listing, increments savesCount once even if saved twice, and lists it", async () => {
    const reseller = await makeReseller("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeReseller("0587654321");

    const first = await request(app).post(`/api/wishlist/${listing.id}`).set("Authorization", `Bearer ${buyer.token}`);
    expect(first.status).toBe(200);
    expect(first.body.saved).toBe(true);

    const second = await request(app).post(`/api/wishlist/${listing.id}`).set("Authorization", `Bearer ${buyer.token}`);
    expect(second.body.saved).toBe(true);

    const dbListing = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(dbListing.savesCount).toBe(1);

    const list = await request(app).get("/api/wishlist").set("Authorization", `Bearer ${buyer.token}`);
    expect(list.body.listings).toHaveLength(1);
    expect(list.body.listings[0].id).toBe(listing.id);
  });

  it("removes a listing and decrements savesCount", async () => {
    const reseller = await makeReseller("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeReseller("0587654321");

    await request(app).post(`/api/wishlist/${listing.id}`).set("Authorization", `Bearer ${buyer.token}`);
    const removed = await request(app).delete(`/api/wishlist/${listing.id}`).set("Authorization", `Bearer ${buyer.token}`);
    expect(removed.body.saved).toBe(false);

    const dbListing = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(dbListing.savesCount).toBe(0);

    const list = await request(app).get("/api/wishlist").set("Authorization", `Bearer ${buyer.token}`);
    expect(list.body.listings).toHaveLength(0);
  });

  it("excludes removed listings from the wishlist view", async () => {
    const reseller = await makeReseller("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeReseller("0587654321");
    await request(app).post(`/api/wishlist/${listing.id}`).set("Authorization", `Bearer ${buyer.token}`);

    await request(app)
      .patch(`/api/listings/${listing.id}/status`)
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ status: "REMOVED" });

    const list = await request(app).get("/api/wishlist").set("Authorization", `Bearer ${buyer.token}`);
    expect(list.body.listings).toHaveLength(0);
  });
});
