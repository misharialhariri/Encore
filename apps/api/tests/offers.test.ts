import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, createListingDirect } from "./helpers";

jest.mock("../src/services/unifonic", () => ({
  sendOtpSms: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function makeUser(phone: string) {
  const token = await loginAndGetAccessToken(app, phone);
  const me = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
  return { token, id: me.body.user.id as string };
}

async function makeOfferableListing(resellerId: string, overrides: Partial<{ askingPrice: number }> = {}) {
  const listing = await createListingDirect({ resellerId, askingPrice: overrides.askingPrice ?? 1000 });
  await prisma.listing.update({ where: { id: listing.id }, data: { acceptsOffers: true } });
  return listing;
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("POST /api/offers", () => {
  it("rejects an offer on a listing that doesn't accept offers", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id }); // acceptsOffers defaults true in fixture — override
    await prisma.listing.update({ where: { id: listing.id }, data: { acceptsOffers: false } });
    const buyer = await makeUser("0587654321");

    const res = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 500 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("OFFERS_NOT_ACCEPTED");
  });

  it("rejects a reseller offering on their own listing", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await makeOfferableListing(reseller.id);

    const res = await request(app).post("/api/offers").set("Authorization", `Bearer ${reseller.token}`).send({ listingId: listing.id, offerPrice: 500 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CANNOT_OFFER_OWN_LISTING");
  });

  it("creates a pending offer expiring in 24 hours, and blocks a second open offer", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await makeOfferableListing(reseller.id);
    const buyer = await makeUser("0587654321");

    const res = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 500 });
    expect(res.status).toBe(201);
    expect(res.body.offer.status).toBe("PENDING");
    const hoursUntilExpiry = (new Date(res.body.offer.expiresAt).getTime() - Date.now()) / (60 * 60 * 1000);
    expect(hoursUntilExpiry).toBeGreaterThan(23.9);
    expect(hoursUntilExpiry).toBeLessThanOrEqual(24.1);

    const dup = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 600 });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("OFFER_ALREADY_OPEN");
  });
});

describe("offer negotiation turn logic", () => {
  it("lets the reseller accept a buyer's offer", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await makeOfferableListing(reseller.id);
    const buyer = await makeUser("0587654321");
    const created = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 500 });

    const buyerTriesToAccept = await request(app).post(`/api/offers/${created.body.offer.id}/accept`).set("Authorization", `Bearer ${buyer.token}`);
    expect(buyerTriesToAccept.status).toBe(403);
    expect(buyerTriesToAccept.body.error.code).toBe("NOT_YOUR_TURN");

    const accepted = await request(app).post(`/api/offers/${created.body.offer.id}/accept`).set("Authorization", `Bearer ${reseller.token}`);
    expect(accepted.status).toBe(200);
    expect(accepted.body.offer.status).toBe("ACCEPTED");
  });

  it("lets the reseller decline a buyer's offer", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await makeOfferableListing(reseller.id);
    const buyer = await makeUser("0587654321");
    const created = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 500 });

    const declined = await request(app).post(`/api/offers/${created.body.offer.id}/decline`).set("Authorization", `Bearer ${reseller.token}`);
    expect(declined.status).toBe(200);
    expect(declined.body.offer.status).toBe("DECLINED");

    // Buyer can now open a fresh thread since the previous one is closed.
    const fresh = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 450 });
    expect(fresh.status).toBe(201);
  });

  it("supports a full counter-offer back-and-forth, alternating turns", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await makeOfferableListing(reseller.id, { askingPrice: 1000 });
    const buyer = await makeUser("0587654321");

    const buyerOffer = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 500 });

    // Buyer cannot counter their own pending offer.
    const buyerSelfCounter = await request(app)
      .post(`/api/offers/${buyerOffer.body.offer.id}/counter`)
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ offerPrice: 550 });
    expect(buyerSelfCounter.status).toBe(403);

    const resellerCounter = await request(app)
      .post(`/api/offers/${buyerOffer.body.offer.id}/counter`)
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ offerPrice: 800 });
    expect(resellerCounter.status).toBe(200);
    expect(resellerCounter.body.offer.status).toBe("PENDING");
    expect(resellerCounter.body.offer.offerPrice).toBe(800);
    expect(resellerCounter.body.offer.parentOfferId).toBe(buyerOffer.body.offer.id);

    const originalNowCountered = await request(app)
      .get(`/api/offers/${buyerOffer.body.offer.id}`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(originalNowCountered.body.offer.status).toBe("COUNTERED");

    const buyerAccepts = await request(app)
      .post(`/api/offers/${resellerCounter.body.offer.id}/accept`)
      .set("Authorization", `Bearer ${buyer.token}`);
    expect(buyerAccepts.status).toBe(200);
    expect(buyerAccepts.body.offer.status).toBe("ACCEPTED");

    const detail = await request(app).get(`/api/offers/${buyerAccepts.body.offer.id}`).set("Authorization", `Bearer ${buyer.token}`);
    expect(detail.body.offer.history).toHaveLength(2);
    expect(detail.body.offer.history[0].offerPrice).toBe(500);
    expect(detail.body.offer.history[1].offerPrice).toBe(800);
  });

  it("expires a stale pending offer lazily on read", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await makeOfferableListing(reseller.id);
    const buyer = await makeUser("0587654321");
    const created = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 500 });

    await prisma.offer.update({ where: { id: created.body.offer.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const detail = await request(app).get(`/api/offers/${created.body.offer.id}`).set("Authorization", `Bearer ${buyer.token}`);
    expect(detail.body.offer.status).toBe("EXPIRED");

    const acceptAttempt = await request(app).post(`/api/offers/${created.body.offer.id}/accept`).set("Authorization", `Bearer ${reseller.token}`);
    expect(acceptAttempt.status).toBe(400);
    expect(acceptAttempt.body.error.code).toBe("OFFER_NOT_ACTIONABLE");
  });
});

describe("GET /api/offers/mine and /api/offers/received", () => {
  it("only shows the current thread head, not superseded counter rows", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await makeOfferableListing(reseller.id);
    const buyer = await makeUser("0587654321");

    const buyerOffer = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 500 });
    await request(app)
      .post(`/api/offers/${buyerOffer.body.offer.id}/counter`)
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ offerPrice: 700 });

    const mine = await request(app).get("/api/offers/mine").set("Authorization", `Bearer ${buyer.token}`);
    expect(mine.body.offers).toHaveLength(1);
    expect(mine.body.offers[0].offerPrice).toBe(700);

    const received = await request(app).get("/api/offers/received").set("Authorization", `Bearer ${reseller.token}`);
    expect(received.body.offers).toHaveLength(1);
    expect(received.body.offers[0].offerPrice).toBe(700);
  });
});
