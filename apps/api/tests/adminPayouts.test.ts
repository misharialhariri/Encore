import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { resetDb, disconnectDb } from "./testDb";
import { loginAndGetAccessToken, makeAdminAndLogin } from "./helpers";

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

async function makePendingPayout(resellerId: string, amount = 500) {
  return prisma.payout.create({ data: { resellerId, amount, status: "PENDING" } });
}

describe("admin payout processing", () => {
  it("walks a payout through processing to paid, notifying the reseller each time", async () => {
    const reseller = await makeUser("0512345678");
    const payout = await makePendingPayout(reseller.id);
    const admin = await makeAdminAndLogin(app, "FINANCE");

    const list = await request(app).get("/api/admin/payouts").set("Authorization", `Bearer ${admin.token}`);
    expect(list.body.payouts.map((p: { id: string }) => p.id)).toContain(payout.id);

    const processing = await request(app).post(`/api/admin/payouts/${payout.id}/mark-processing`).set("Authorization", `Bearer ${admin.token}`);
    expect(processing.status).toBe(200);
    expect(processing.body.payout.status).toBe("PROCESSING");

    const paid = await request(app).post(`/api/admin/payouts/${payout.id}/mark-paid`).set("Authorization", `Bearer ${admin.token}`);
    expect(paid.status).toBe(200);
    expect(paid.body.payout.status).toBe("PAID");
    expect(paid.body.payout.processedAt).not.toBeNull();

    const notifications = await prisma.notification.findMany({ where: { userId: reseller.id, type: "PAYOUT_UPDATE" } });
    expect(notifications).toHaveLength(2);
  });

  it("marks a payout failed", async () => {
    const reseller = await makeUser("0512345678");
    const payout = await makePendingPayout(reseller.id);
    const admin = await makeAdminAndLogin(app, "FINANCE");

    const failed = await request(app).post(`/api/admin/payouts/${payout.id}/mark-failed`).set("Authorization", `Bearer ${admin.token}`);
    expect(failed.status).toBe(200);
    expect(failed.body.payout.status).toBe("FAILED");
  });

  it("rejects transitioning a payout that's already terminal", async () => {
    const reseller = await makeUser("0512345678");
    const payout = await makePendingPayout(reseller.id);
    const admin = await makeAdminAndLogin(app, "FINANCE");

    await request(app).post(`/api/admin/payouts/${payout.id}/mark-failed`).set("Authorization", `Bearer ${admin.token}`);
    const retry = await request(app).post(`/api/admin/payouts/${payout.id}/mark-paid`).set("Authorization", `Bearer ${admin.token}`);

    expect(retry.status).toBe(400);
    expect(retry.body.error.code).toBe("INVALID_PAYOUT_STATUS");
  });

  it("rejects a non-FINANCE admin from processing payouts", async () => {
    const opsAdmin = await makeAdminAndLogin(app, "OPS");
    const res = await request(app).get("/api/admin/payouts").set("Authorization", `Bearer ${opsAdmin.token}`);
    expect(res.status).toBe(403);
  });
});
