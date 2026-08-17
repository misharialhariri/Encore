import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, createListingDirect, driveOrderToStage, makeAdminAndLogin } from "./helpers";

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

async function openDispute(buyerToken: string, orderId: string) {
  const res = await request(app)
    .post("/api/disputes")
    .set("Authorization", `Bearer ${buyerToken}`)
    .send({ orderId, reason: "Item not as described", description: "Stained bodice." });
  return res.body.dispute.id as string;
}

describe("admin dispute resolution", () => {
  it("releases escrow to the reseller, completing the order and notifying both parties", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "SHIPPED");
    const disputeId = await openDispute(buyer.token, orderId);

    const admin = await makeAdminAndLogin(app, "OPS");
    const list = await request(app).get("/api/admin/disputes").set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.disputes.map((d: { id: string }) => d.id)).toContain(disputeId);

    const resolved = await request(app)
      .post(`/api/admin/disputes/${disputeId}/resolve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ outcome: "RELEASE_TO_RESELLER", resolution: "Photos show item matched description" });

    expect(resolved.status).toBe(200);
    expect(resolved.body.dispute.status).toBe("RESOLVED");

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    expect(order?.status).toBe("COMPLETED");
    expect(order?.payment?.escrowStatus).toBe("RELEASED");

    const buyerNotifications = await prisma.notification.findMany({ where: { userId: buyer.id, type: "DISPUTE_UPDATE" } });
    const resellerNotifications = await prisma.notification.findMany({ where: { userId: reseller.id, type: "DISPUTE_UPDATE" } });
    expect(buyerNotifications.length).toBeGreaterThan(0);
    expect(resellerNotifications.length).toBeGreaterThan(0);
  });

  it("refunds the buyer, cancelling the order", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "SHIPPED");
    const disputeId = await openDispute(buyer.token, orderId);

    const admin = await makeAdminAndLogin(app, "FINANCE");
    const resolved = await request(app)
      .post(`/api/admin/disputes/${disputeId}/resolve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ outcome: "REFUND_BUYER", resolution: "Item confirmed damaged in photos" });

    expect(resolved.status).toBe(200);

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
    expect(order?.status).toBe("CANCELLED");
    expect(order?.payment?.escrowStatus).toBe("REFUNDED");
  });

  it("rejects resolving an already-resolved dispute", async () => {
    const reseller = await makeUser("0512345678");
    const listing = await createListingDirect({ resellerId: reseller.id });
    const buyer = await makeUser("0587654321");
    const orderId = await driveOrderToStage(app, buyer.token, reseller.token, listing.id, "SHIPPED");
    const disputeId = await openDispute(buyer.token, orderId);

    const admin = await makeAdminAndLogin(app, "OPS");
    await request(app)
      .post(`/api/admin/disputes/${disputeId}/resolve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ outcome: "RELEASE_TO_RESELLER", resolution: "First resolution" });

    const second = await request(app)
      .post(`/api/admin/disputes/${disputeId}/resolve`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({ outcome: "REFUND_BUYER", resolution: "Second attempt" });

    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe("DISPUTE_ALREADY_RESOLVED");
  });

  it("rejects a SUPPORT admin (wrong role) from resolving disputes", async () => {
    const supportAdmin = await makeAdminAndLogin(app, "SUPPORT");
    const res = await request(app).get("/api/admin/disputes").set("Authorization", `Bearer ${supportAdmin.token}`);
    expect(res.status).toBe(403);
  });
});
