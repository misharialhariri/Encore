import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, createListingDirect, makeCityNamed } from "./helpers";

jest.mock("../src/services/unifonic", () => ({
  sendOtpSms: jest.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function makeUser(phone: string) {
  const token = await loginAndGetAccessToken(app, phone);
  const me = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
  return { token, id: me.body.user.id as string };
}

async function seedFees() {
  await prisma.platformSetting.upsert({ where: { key: "service_fee_pct" }, update: { value: "10" }, create: { key: "service_fee_pct", value: "10" } });
  await prisma.platformSetting.upsert({
    where: { key: "flat_shipping_fee_sar" },
    update: { value: "25" },
    create: { key: "flat_shipping_fee_sar", value: "25" },
  });
}

async function makeAddress(token: string) {
  const city = await makeCityNamed("Jeddah", "جدة", "Makkah", "مكة المكرمة");
  const res = await request(app)
    .post("/api/addresses")
    .set("Authorization", `Bearer ${token}`)
    .send({ label: "Home", cityId: city.id, district: "Al Balad", street: "King Rd" });
  return res.body.address;
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("POST /api/orders", () => {
  it("computes the price breakdown and reserves the listing as SOLD", async () => {
    await seedFees();
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id, askingPrice: 1000 });
    const buyer = await makeUser("0587654321");
    const address = await makeAddress(buyer.token);

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ listingId: listing.id, deliveryMethod: "SHIPPING", addressId: address.id });

    expect(res.status).toBe(201);
    expect(res.body.order.itemPrice).toBe(1000);
    expect(res.body.order.shippingFee).toBe(25);
    expect(res.body.order.platformFee).toBe(100);
    expect(res.body.order.totalAmount).toBe(1125);
    expect(res.body.order.status).toBe("PLACED");

    const dbListing = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(dbListing.status).toBe("SOLD");
  });

  it("rejects buying your own listing", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ listingId: listing.id, deliveryMethod: "MEETUP", meetupLat: 24.7, meetupLng: 46.7 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CANNOT_BUY_OWN_LISTING");
  });

  it("rejects a second order on an already-sold listing", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer1 = await makeUser("0587654321");
    const buyer2 = await makeUser("0511119999");

    await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer1.token}`)
      .send({ listingId: listing.id, deliveryMethod: "MEETUP", meetupLat: 24.7, meetupLng: 46.7 });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer2.token}`)
      .send({ listingId: listing.id, deliveryMethod: "MEETUP", meetupLat: 24.7, meetupLng: 46.7 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("LISTING_NOT_AVAILABLE");
  });

  it("rejects shipping when the listing doesn't offer it", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await prisma.listing.update({
      where: { id: (await createListingDirect({ resellerId: reseller.id })).id },
      data: { shippingAvailable: false },
    });
    const buyer = await makeUser("0587654321");
    const address = await makeAddress(buyer.token);

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ listingId: listing.id, deliveryMethod: "SHIPPING", addressId: address.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("SHIPPING_NOT_AVAILABLE");
  });

  it("requires meetup coordinates for a meetup order", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ listingId: listing.id, deliveryMethod: "MEETUP" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("uses the accepted offer price instead of the asking price", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id, askingPrice: 1000 });
    await prisma.listing.update({ where: { id: listing.id }, data: { acceptsOffers: true } });
    const buyer = await makeUser("0587654321");

    const offer = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 700 });
    await request(app).post(`/api/offers/${offer.body.offer.id}/accept`).set("Authorization", `Bearer ${reseller.token}`);

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ listingId: listing.id, offerId: offer.body.offer.id, deliveryMethod: "MEETUP", meetupLat: 24.7, meetupLng: 46.7 });

    expect(res.status).toBe(201);
    expect(res.body.order.itemPrice).toBe(700);
  });

  it("rejects an order using an offer that hasn't been accepted", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    await prisma.listing.update({ where: { id: listing.id }, data: { acceptsOffers: true } });
    const buyer = await makeUser("0587654321");
    const offer = await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 700 });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ listingId: listing.id, offerId: offer.body.offer.id, deliveryMethod: "MEETUP", meetupLat: 24.7, meetupLng: 46.7 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("OFFER_NOT_ACCEPTED");
  });
});

describe("dev-mode payment + order lifecycle", () => {
  async function placeOrder(buyerToken: string, listingId: string) {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId, deliveryMethod: "MEETUP", meetupLat: 24.7, meetupLng: 46.7, meetupDescription: "Mall parking lot" });
    return res.body.order.id as string;
  }

  it("returns devMode checkout when Moyasar is not configured", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await placeOrder(buyer.token, listing.id);

    const checkout = await request(app).post(`/api/orders/${orderId}/checkout`).set("Authorization", `Bearer ${buyer.token}`);
    expect(checkout.status).toBe(200);
    expect(checkout.body.devMode).toBe(true);
    expect(checkout.body.checkoutUrl).toBeNull();

    // The synthetic dev invoice id can't be verified against the real Moyasar API.
    const refresh = await request(app).post(`/api/orders/${orderId}/refresh-payment-status`).set("Authorization", `Bearer ${buyer.token}`);
    expect(refresh.body.applied).toBe(false);
  });

  it("drives an order through the full lifecycle to completion with escrow release", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await placeOrder(buyer.token, listing.id);

    await request(app).post(`/api/orders/${orderId}/checkout`).set("Authorization", `Bearer ${buyer.token}`);

    // Reseller confirming before payment should fail.
    const tooEarly = await request(app).post(`/api/orders/${orderId}/confirm`).set("Authorization", `Bearer ${reseller.token}`);
    expect(tooEarly.status).toBe(400);
    expect(tooEarly.body.error.code).toBe("ORDER_NOT_PAID");

    const paid = await request(app).post(`/api/orders/${orderId}/dev-simulate-payment`).set("Authorization", `Bearer ${buyer.token}`);
    expect(paid.body.applied).toBe(true);

    const confirmed = await request(app).post(`/api/orders/${orderId}/confirm`).set("Authorization", `Bearer ${reseller.token}`);
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.order.status).toBe("CONFIRMED");

    const buyerCannotShip = await request(app).post(`/api/orders/${orderId}/ship`).set("Authorization", `Bearer ${buyer.token}`).send({ trackingNumber: "TRK1", courierName: "Aramex" });
    expect(buyerCannotShip.status).toBe(403);

    const shipped = await request(app)
      .post(`/api/orders/${orderId}/ship`)
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ trackingNumber: "TRK123", courierName: "Aramex" });
    expect(shipped.status).toBe(200);
    expect(shipped.body.order.status).toBe("SHIPPED");
    expect(shipped.body.order.trackingNumber).toBe("TRK123");

    const delivered = await request(app).post(`/api/orders/${orderId}/deliver`).set("Authorization", `Bearer ${reseller.token}`);
    expect(delivered.body.order.status).toBe("DELIVERED");

    const resellerCannotConfirmReceipt = await request(app).post(`/api/orders/${orderId}/confirm-receipt`).set("Authorization", `Bearer ${reseller.token}`);
    expect(resellerCannotConfirmReceipt.status).toBe(403);

    const completed = await request(app).post(`/api/orders/${orderId}/confirm-receipt`).set("Authorization", `Bearer ${buyer.token}`);
    expect(completed.status).toBe(200);
    expect(completed.body.order.status).toBe("COMPLETED");
    expect(completed.body.order.payment.escrowStatus).toBe("RELEASED");
  });

  it("lists orders on both the buyer and reseller sides", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    await placeOrder(buyer.token, listing.id);

    const mine = await request(app).get("/api/orders/mine").set("Authorization", `Bearer ${buyer.token}`);
    expect(mine.body.orders).toHaveLength(1);

    const selling = await request(app).get("/api/orders/selling").set("Authorization", `Bearer ${reseller.token}`);
    expect(selling.body.orders).toHaveLength(1);

    const strangerToken = (await makeUser("0511119999")).token;
    const strangerView = await request(app).get(`/api/orders/${mine.body.orders[0].id}`).set("Authorization", `Bearer ${strangerToken}`);
    expect(strangerView.status).toBe(403);
  });
});
