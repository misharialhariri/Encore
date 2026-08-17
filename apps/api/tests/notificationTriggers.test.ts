import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, createListingDirect, driveOrderToStage } from "./helpers";

jest.mock("../src/services/unifonic", () => ({
  sendOtpSms: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function makeUser(phone: string) {
  const token = await loginAndGetAccessToken(app, phone);
  const me = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
  return { token, id: me.body.user.id as string };
}

async function notificationTypesFor(userId: string): Promise<string[]> {
  const rows = await prisma.notification.findMany({ where: { userId } });
  return rows.map((r) => r.type);
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("offer notification triggers", () => {
  it("notifies the reseller on offer received, and each party on accept/decline/counter", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    await prisma.listing.update({ where: { id: listing.id }, data: { acceptsOffers: true } });
    const buyer = await makeUser("0587654321");

    const offer = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 500 });
    expect(await notificationTypesFor(reseller.id)).toContain("OFFER_RECEIVED");

    const countered = await request(app)
      .post(`/api/offers/${offer.body.offer.id}/counter`)
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ offerPrice: 600 });
    expect(await notificationTypesFor(buyer.id)).toContain("OFFER_COUNTERED");

    await request(app).post(`/api/offers/${countered.body.offer.id}/decline`).set("Authorization", `Bearer ${buyer.token}`);
    expect(await notificationTypesFor(reseller.id)).toContain("OFFER_DECLINED");
  });

  it("notifies the buyer when their offer is accepted", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    await prisma.listing.update({ where: { id: listing.id }, data: { acceptsOffers: true } });
    const buyer = await makeUser("0587654321");

    const offer = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 500 });
    await request(app).post(`/api/offers/${offer.body.offer.id}/accept`).set("Authorization", `Bearer ${reseller.token}`);

    expect(await notificationTypesFor(buyer.id)).toContain("OFFER_ACCEPTED");
  });
});

describe("order status notification triggers", () => {
  it("notifies both sides through the full lifecycle", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");

    const order = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ listingId: listing.id, deliveryMethod: "MEETUP", meetupLat: 24.7, meetupLng: 46.7 });
    const orderId = order.body.order.id;

    await request(app).post(`/api/orders/${orderId}/dev-simulate-payment`).set("Authorization", `Bearer ${buyer.token}`);
    expect(await notificationTypesFor(reseller.id)).toContain("ORDER_STATUS_UPDATE");

    await request(app).post(`/api/orders/${orderId}/confirm`).set("Authorization", `Bearer ${reseller.token}`);
    let buyerTypes = await notificationTypesFor(buyer.id);
    expect(buyerTypes.filter((t) => t === "ORDER_STATUS_UPDATE")).toHaveLength(1);

    await request(app)
      .post(`/api/orders/${orderId}/ship`)
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ trackingNumber: "TRK1", courierName: "Aramex" });
    buyerTypes = await notificationTypesFor(buyer.id);
    expect(buyerTypes.filter((t) => t === "ORDER_STATUS_UPDATE")).toHaveLength(2);

    await request(app).post(`/api/orders/${orderId}/deliver`).set("Authorization", `Bearer ${reseller.token}`);
    buyerTypes = await notificationTypesFor(buyer.id);
    expect(buyerTypes.filter((t) => t === "ORDER_STATUS_UPDATE")).toHaveLength(3);

    const resellerBefore = (await notificationTypesFor(reseller.id)).filter((t) => t === "ORDER_STATUS_UPDATE").length;
    await request(app).post(`/api/orders/${orderId}/confirm-receipt`).set("Authorization", `Bearer ${buyer.token}`);
    const resellerAfter = (await notificationTypesFor(reseller.id)).filter((t) => t === "ORDER_STATUS_UPDATE").length;
    expect(resellerAfter).toBe(resellerBefore + 1);
  });
});

describe("review notification trigger", () => {
  it("notifies the reseller when a review is left", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "COMPLETED");

    await request(app).post("/api/reviews").set("Authorization", `Bearer ${buyer.token}`).send({ orderId, rating: 5 });
    expect(await notificationTypesFor(reseller.id)).toContain("REVIEW_RECEIVED");
  });
});

describe("dispute notification trigger", () => {
  it("notifies the reseller when a dispute is opened", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "SHIPPED");

    await request(app)
      .post("/api/disputes")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ orderId, reason: "Item not as described", description: "Stained bodice." });
    expect(await notificationTypesFor(reseller.id)).toContain("DISPUTE_UPDATE");
  });
});

describe("wishlist price-drop trigger", () => {
  it("notifies wishlisters when the asking price drops, but not when it rises", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id, askingPrice: 1000 });
    const buyer = await makeUser("0587654321");
    await request(app).post(`/api/wishlist/${listing.id}`).set("Authorization", `Bearer ${buyer.token}`);

    await request(app).put(`/api/listings/${listing.id}`).set("Authorization", `Bearer ${reseller.token}`).send({ askingPrice: 1200 });
    expect(await notificationTypesFor(buyer.id)).not.toContain("PRICE_DROP");

    await request(app).put(`/api/listings/${listing.id}`).set("Authorization", `Bearer ${reseller.token}`).send({ askingPrice: 800 });
    expect(await notificationTypesFor(buyer.id)).toContain("PRICE_DROP");
  });
});
