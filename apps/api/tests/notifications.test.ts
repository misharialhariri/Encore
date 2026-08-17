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

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("GET /api/notifications/preferences", () => {
  it("defaults every known type to enabled when no rows exist", async () => {
    const user = await makeUser("0512345678");
    const res = await request(app).get("/api/notifications/preferences").set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(200);
    expect(res.body.preferences.length).toBeGreaterThan(0);
    expect(res.body.preferences.every((p: any) => p.enabled === true)).toBe(true);
    expect(res.body.preferences.map((p: any) => p.type)).toContain("OFFER_RECEIVED");
  });

  it("persists a toggle and reflects it on the next read", async () => {
    const user = await makeUser("0512345678");
    await request(app)
      .put("/api/notifications/preferences")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ type: "OFFER_RECEIVED", enabled: false });

    const res = await request(app).get("/api/notifications/preferences").set("Authorization", `Bearer ${user.token}`);
    const offerPref = res.body.preferences.find((p: any) => p.type === "OFFER_RECEIVED");
    expect(offerPref.enabled).toBe(false);
  });
});

describe("notification center", () => {
  it("lists, counts unread, marks read, and clears all", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    await prisma.listing.update({ where: { id: listing.id }, data: { acceptsOffers: true } });
    const buyer = await makeUser("0587654321");

    await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 500 });

    const list = await request(app).get("/api/notifications").set("Authorization", `Bearer ${reseller.token}`);
    expect(list.body.notifications).toHaveLength(1);
    expect(list.body.notifications[0].type).toBe("OFFER_RECEIVED");
    expect(list.body.notifications[0].isRead).toBe(false);

    const unread = await request(app).get("/api/notifications/unread-count").set("Authorization", `Bearer ${reseller.token}`);
    expect(unread.body.count).toBe(1);

    const notificationId = list.body.notifications[0].id;
    await request(app).post(`/api/notifications/${notificationId}/read`).set("Authorization", `Bearer ${reseller.token}`);
    const afterRead = await request(app).get("/api/notifications/unread-count").set("Authorization", `Bearer ${reseller.token}`);
    expect(afterRead.body.count).toBe(0);

    await request(app)
      .delete("/api/notifications")
      .set("Authorization", `Bearer ${reseller.token}`);
    const afterClear = await request(app).get("/api/notifications").set("Authorization", `Bearer ${reseller.token}`);
    expect(afterClear.body.notifications).toHaveLength(0);
  });

  it("does not create a notification for a type the user has disabled", async () => {
    const reseller = await makeUser("0512345678");
    await request(app)
      .put("/api/notifications/preferences")
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ type: "OFFER_RECEIVED", enabled: false });

    const listing = await createListingDirect({ resellerId: reseller.id });
    await prisma.listing.update({ where: { id: listing.id }, data: { acceptsOffers: true } });
    const buyer = await makeUser("0587654321");
    await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing.id, offerPrice: 500 });

    const list = await request(app).get("/api/notifications").set("Authorization", `Bearer ${reseller.token}`);
    expect(list.body.notifications).toHaveLength(0);
  });

  it("marks all as read in one call", async () => {
    const reseller = await makeUser("0512345678");
    const listing1 = await createListingDirect({ resellerId: reseller.id, title: "Gown 1" });
    const listing2 = await createListingDirect({ resellerId: reseller.id, title: "Gown 2" });
    await prisma.listing.updateMany({ where: { id: { in: [listing1.id, listing2.id] } }, data: { acceptsOffers: true } });
    const buyer = await makeUser("0587654321");
    await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing1.id, offerPrice: 500 });
    await request(app).post("/api/offers").set("Authorization", `Bearer ${buyer.token}`).send({ listingId: listing2.id, offerPrice: 400 });

    await request(app).post("/api/notifications/read-all").set("Authorization", `Bearer ${reseller.token}`);
    const unread = await request(app).get("/api/notifications/unread-count").set("Authorization", `Bearer ${reseller.token}`);
    expect(unread.body.count).toBe(0);
  });
});

describe("POST /api/devices", () => {
  it("registers a device and is idempotent for the same token", async () => {
    const user = await makeUser("0512345678");
    const first = await request(app).post("/api/devices").set("Authorization", `Bearer ${user.token}`).send({ pushToken: "ExponentPushToken[abc]", platform: "IOS" });
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/devices").set("Authorization", `Bearer ${user.token}`).send({ pushToken: "ExponentPushToken[abc]", platform: "IOS" });
    expect(second.status).toBe(201);

    const count = await prisma.device.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });
});
