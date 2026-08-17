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

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe("POST /api/disputes", () => {
  it("lets the buyer open a dispute on a shipped order, moves the order to DISPUTED, and notifies the reseller", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "SHIPPED");

    const res = await request(app)
      .post("/api/disputes")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ orderId, reason: "Item not as described", description: "The dress arrived with a stain on the bodice." });

    expect(res.status).toBe(201);
    expect(res.body.dispute.status).toBe("OPEN");
    expect(res.body.dispute.order.id).toBe(orderId);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe("DISPUTED");

    const notifications = await prisma.notification.findMany({ where: { userId: reseller.id, type: "DISPUTE_UPDATE" } });
    expect(notifications).toHaveLength(1);
  });

  it("rejects opening a dispute before the order has shipped", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "CONFIRMED");

    const res = await request(app)
      .post("/api/disputes")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ orderId, reason: "Changed my mind", description: "Not what I expected." });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ORDER_STATUS");
  });

  it("rejects a second open dispute on the same order once it has moved to DISPUTED", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "SHIPPED");

    await request(app)
      .post("/api/disputes")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ orderId, reason: "Item not as described", description: "Stained bodice." });

    // The order has already left SHIPPED/DELIVERED for DISPUTED, so the
    // order-status guard is what blocks the retry here — the explicit
    // DISPUTE_ALREADY_OPEN check exists for the case where an order returns
    // to a disputable status while an open dispute still exists.
    const second = await request(app)
      .post("/api/disputes")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ orderId, reason: "Item not as described", description: "Still stained." });

    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("INVALID_ORDER_STATUS");
  });

  it("rejects a dispute from someone who isn't the buyer", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "SHIPPED");

    const res = await request(app)
      .post("/api/disputes")
      .set("Authorization", `Bearer ${reseller.token}`)
      .send({ orderId, reason: "Item not as described", description: "Stained bodice." });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/disputes/mine and /:id", () => {
  it("is visible to both the buyer and reseller, and rejects a stranger", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const stranger = await makeUser("0511119999");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "SHIPPED");

    const created = await request(app)
      .post("/api/disputes")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ orderId, reason: "Item not as described", description: "Stained bodice." });
    const disputeId = created.body.dispute.id;

    const buyerMine = await request(app).get("/api/disputes/mine").set("Authorization", `Bearer ${buyer.token}`);
    expect(buyerMine.body.disputes).toHaveLength(1);

    const resellerMine = await request(app).get("/api/disputes/mine").set("Authorization", `Bearer ${reseller.token}`);
    expect(resellerMine.body.disputes).toHaveLength(1);

    const detail = await request(app).get(`/api/disputes/${disputeId}`).set("Authorization", `Bearer ${reseller.token}`);
    expect(detail.status).toBe(200);

    const forbidden = await request(app).get(`/api/disputes/${disputeId}`).set("Authorization", `Bearer ${stranger.token}`);
    expect(forbidden.status).toBe(403);
  });
});

describe("POST /api/disputes/evidence-upload-url", () => {
  it("returns a presigned S3 upload URL", async () => {
    const buyer = await makeUser("0587654321");
    const res = await request(app)
      .post("/api/disputes/evidence-upload-url")
      .set("Authorization", `Bearer ${buyer.token}`)
      .send({ contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body.uploadUrl).toMatch(/^https:\/\//);
    expect(res.body.publicUrl).toContain("cdn.encore.example");
  });
});
